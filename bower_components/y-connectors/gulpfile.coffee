gulp = require 'gulp'
coffee = require 'gulp-coffee'
concat = require 'gulp-concat'
uglify = require 'gulp-uglify'
sourcemaps = require 'gulp-sourcemaps'
plumber = require 'gulp-plumber'
browserify = require 'gulp-browserify'
rename = require 'gulp-rename'
ignore = require 'gulp-ignore'
coffeelint = require 'gulp-coffeelint'

paths =
  test:   ['./lib/y-test/**/*.coffee']
  xmpp:   ['./lib/y-xmpp/**/*.coffee']


buildConnector = (connector_name)->
  ()->
    gulp.src(paths[connector_name])
      .pipe plumber()
      .pipe coffeelint()
      .pipe coffeelint.reporter()

    gulp.src(paths[connector_name], {read: false})
      .pipe(plumber())
      .pipe browserify
        transform: ['coffeeify']
        extensions: ['.coffee']
        debug: true
        ignore: ['faye-websocket', './srv', 'dns', 'tls']
      .pipe rename
        extname: ".js"
      .pipe gulp.dest('./y-'+connector_name)
      .pipe uglify()
      .pipe rename
        extname: ".min.js"
      .pipe gulp.dest('./y-'+connector_name)

gulp.task 'build_node', ->
  gulp.src(['./lib/**'])
    .pipe plumber()
    .pipe ignore.exclude '**/*polymer.coffee'
    .pipe coffee({bare:true})
    .pipe gulp.dest './build/node'

gulp.task 'xmpp', [], buildConnector 'xmpp'
gulp.task 'test', [], buildConnector 'test'

gulp.task 'build_browser', ['xmpp', 'test']
gulp.task 'build', ['build_browser', 'build_node']

# Rerun the task when a file changes
gulp.task 'watch', ()->
  gulp.watch(paths.test, ['test'])
  gulp.watch(paths.xmpp, ['xmpp'])

gulp.task('default', ['watch', 'build'])









