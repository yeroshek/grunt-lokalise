# grunt-lokalise

> Grunt plugin for i18n service lokali.se

## Getting Started
Grunt-lokalise provides a command line interface to sync your i18n files with http://lokali.se

Install it:

```
npm install grunt-lokalise --save-dev
```

Add a line to your Grunfile:

```
grunt.loadNpmTasks('grunt-lokalise');
```

## The "lokalise" task

### Overview
In your project's Gruntfile, add a section named `lokalise` to the data object passed into `grunt.initConfig()`.

```
grunt.initConfig({
  lokalise: {
    all: {
      apiToken: 'YOUR API TOKEN HERE',
      projectId: 'YOUR PROJECT ID AT LOKALI.SE',

      // Put all of your lang files here
      files: {
        src: [
          'application/language/**/*.php',
          'js/language/**/*.json'
        ]
      }
    },
  },
});
```

Lokali.se wants your filenames to be identical for different languages, so follow a file structure like this:

language/en/common.json
language/ru/common.json

### Usage Examples

At your project directory type ``grunt lokalise``. Plugin will push your files and then pull latest changes from lokali.se afterwards. You can use ``grunt lokalise --push`` and ``grunt lokalise --pull`` to perform only one action.

