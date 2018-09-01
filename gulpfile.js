'use strict';

var gulp = require('gulp');
var devServer = require('gulp-develop-server'); //gulp插件，自动启动node和重启
var notify = require('gulp-notify');

gulp.task('serve', (done) => {
    devServer.listen({
        path: './index.js'
    });
    done();
});


gulp.task('restart', (done) => {
    devServer.restart();
    done();
});

gulp.task('notify', () => (gulp.src('./index.js').pipe(notify('服务重启成功！'))));

gulp.task('watch', () => {
  return gulp.watch(['./**/*', '!/gulpfile.js', '!/package.json', '!/files/**/*'], gulp.series('restart', 'notify'));
});

gulp.task('default', gulp.series('serve', 'watch'));