// Generated by CoffeeScript 1.8.0
(function() {
  var Docco, buildMatchers, commander, configure, defaults, document, format, fs, getLanguage, highlightjs, languages, marked, parse, path, run, version, write, _,
    __slice = [].slice;

  document = function(options, callback) {
    var config;
    if (options == null) {
      options = {};
    }
    config = configure(options);
    return fs.mkdirs(config.output, function() {
      var complete, copyAsset, files, nextFile;
      callback || (callback = function(error) {
        if (error) {
          throw error;
        }
      });
      copyAsset = function(file, callback) {
        if (!fs.existsSync(file)) {
          return callback();
        }
        return fs.copy(file, path.join(config.output, path.basename(file)), callback);
      };
      complete = function() {
        return copyAsset(config.css, function(error) {
          if (error) {
            return callback(error);
          }
          if (fs.existsSync(config["public"])) {
            return copyAsset(config["public"], callback);
          }
          return callback();
        });
      };
      files = config.sources.slice();
      nextFile = function() {
        var source;
        source = files.shift();
        return fs.readFile(source, function(error, buffer) {
          var code, sections;
          if (error) {
            return callback(error);
          }
          code = buffer.toString();
          sections = parse(source, code, config);
          format(source, sections, config);
          write(source, sections, config);
          if (files.length) {
            return nextFile();
          } else {
            return complete();
          }
        });
      };
      return nextFile();
    });
  };

  parse = function(source, code, config) {
    var codeText, docsText, hasCode, i, isText, lang, line, lines, match, maybeCode, save, sections, _i, _j, _len, _len1;
    if (config == null) {
      config = {};
    }
    lines = code.split('\n');
    sections = [];
    lang = getLanguage(source, config);
    hasCode = docsText = codeText = '';
    save = function() {
      sections.push({
        docsText: docsText,
        codeText: codeText
      });
      return hasCode = docsText = codeText = '';
    };
    if (lang.literate) {
      isText = maybeCode = true;
      for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
        line = lines[i];
        lines[i] = maybeCode && (match = /^([ ]{4}|[ ]{0,3}\t)/.exec(line)) ? (isText = false, line.slice(match[0].length)) : (maybeCode = /^\s*$/.test(line)) ? isText ? lang.symbol : '' : (isText = true, lang.symbol + ' ' + line);
      }
    }
    for (_j = 0, _len1 = lines.length; _j < _len1; _j++) {
      line = lines[_j];
      if (line.match(lang.commentMatcher) && !line.match(lang.commentFilter)) {
        if (hasCode) {
          save();
        }
        docsText += (line = line.replace(lang.commentMatcher, '')) + '\n';
        if (/^(---+|===+)$/.test(line)) {
          save();
        }
      } else {
        hasCode = true;
        codeText += line + '\n';
      }
    }
    save();
    return sections;
  };

  format = function(source, sections, config) {
    var code, i, language, markedOptions, section, _i, _len, _results;
    language = getLanguage(source, config);
    markedOptions = {
      smartypants: true
    };
    if (config.marked) {
      markedOptions = config.marked;
    }
    marked.setOptions(markedOptions);
    marked.setOptions({
      highlight: function(code, lang) {
        lang || (lang = language.name);
        if (highlightjs.getLanguage(lang)) {
          return highlightjs.highlight(lang, code).value;
        } else {
          console.warn("docco: couldn't highlight code block with unknown language '" + lang + "' in " + source);
          return code;
        }
      }
    });
    _results = [];
    for (i = _i = 0, _len = sections.length; _i < _len; i = ++_i) {
      section = sections[i];
      code = highlightjs.highlight(language.name, section.codeText).value;
      code = code.replace(/\s+$/, '');
      section.codeHtml = "<div class='highlight'><pre>" + code + "</pre></div>";
      _results.push(section.docsHtml = marked(section.docsText));
    }
    return _results;
  };

  write = function(source, sections, config) {
    var destination, first, firstSection, hasTitle, html, title;
    destination = function(file) {
      return path.join(config.output, file + '.html');
    };
    firstSection = _.find(sections, function(section) {
      return section.docsText.length > 0;
    });
    if (firstSection) {
      first = marked.lexer(firstSection.docsText)[0];
    }
    hasTitle = first && first.type === 'heading' && first.depth === 1;
    title = hasTitle ? first.text : path.basename(source);
    html = config.template({
      sources: config.sources,
      css: path.basename(config.css),
      title: title,
      hasTitle: hasTitle,
      sections: sections,
      path: path,
      destination: destination
    });
    console.log("docco: " + source + " -> " + (destination(source)));
    return fs.writeFileSync(destination(source), html);
  };

  defaults = {
    layout: 'parallel',
    output: 'docs',
    template: null,
    css: null,
    extension: null,
    languages: {},
    marked: null
  };

  configure = function(options) {
    var config, dir;
    config = _.extend({}, defaults, _.pick.apply(_, [options].concat(__slice.call(_.keys(defaults)))));
    config.languages = buildMatchers(config.languages);
    if (options.template) {
      if (!options.css) {
        console.warn("docco: no stylesheet file specified");
      }
      config.layout = null;
    } else {
      dir = config.layout = path.join(__dirname, 'resources', config.layout);
      if (fs.existsSync(path.join(dir, 'public'))) {
        config["public"] = path.join(dir, 'public');
      }
      config.template = path.join(dir, 'docco.jst');
      config.css = options.css || path.join(dir, 'docco.css');
    }
    config.template = _.template(fs.readFileSync(config.template).toString());
    if (options.marked) {
      config.marked = JSON.parse(fs.readFileSync(options.marked));
    }
    config.sources = options.args.filter(function(source) {
      var lang;
      lang = getLanguage(source, config);
      if (!lang) {
        console.warn("docco: skipped unknown type (" + (path.basename(source)) + ")");
      }
      return lang;
    }).sort();
    return config;
  };

  _ = require('underscore');

  fs = require('fs-extra');

  path = require('path');

  marked = require('marked');

  commander = require('commander');

  highlightjs = require('highlight.js');

  languages = JSON.parse(fs.readFileSync(path.join(__dirname, 'resources', 'languages.json')));

  buildMatchers = function(languages) {
    var ext, l;
    for (ext in languages) {
      l = languages[ext];
      l.commentMatcher = RegExp("^\\s*" + l.symbol + "\\s?");
      l.commentFilter = /(^#![/]|^\s*#\{)/;
    }
    return languages;
  };

  languages = buildMatchers(languages);

  getLanguage = function(source, config) {
    var codeExt, codeLang, ext, lang, _ref;
    ext = config.extension || path.extname(source) || path.basename(source);
    lang = ((_ref = config.languages) != null ? _ref[ext] : void 0) || languages[ext];
    if (lang && lang.name === 'markdown') {
      codeExt = path.extname(path.basename(source, ext));
      if (codeExt && (codeLang = languages[codeExt])) {
        lang = _.extend({}, codeLang, {
          literate: true
        });
      }
    }
    return lang;
  };

  version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version;

  run = function(args) {
    var c;
    if (args == null) {
      args = process.argv;
    }
    c = defaults;
    commander.version(version).usage('[options] files').option('-L, --languages [file]', 'use a custom languages.json', _.compose(JSON.parse, fs.readFileSync)).option('-l, --layout [name]', 'choose a layout (parallel, linear or classic)', c.layout).option('-o, --output [path]', 'output to a given folder', c.output).option('-c, --css [file]', 'use a custom css file', c.css).option('-t, --template [file]', 'use a custom .jst template', c.template).option('-e, --extension [ext]', 'assume a file extension for all inputs', c.extension).option('-m, --marked [file]', 'use custom marked options', c.marked).parse(args).name = "docco";
    if (commander.args.length) {
      return document(commander);
    } else {
      return console.log(commander.helpInformation());
    }
  };

  Docco = module.exports = {
    run: run,
    document: document,
    parse: parse,
    format: format,
    version: version
  };

}).call(this);
