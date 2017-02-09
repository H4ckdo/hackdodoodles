const webpack = require('webpack');
const path = require('path');
const WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
  entry: {
    homepage: './src/js/homepage'
  },
  output: {
    path: path.join(__dirname, "/public/js"),
    filename:"[name].bundle.js",
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js']
  },
  module: {
    loaders:[
      {
        test:/\.js?$/,
        loader:'babel-loader',
        exclude: '/node_modules',
        query: {
          presets: ['es2015']
        }
      }
    ]
  },
  plugins: [
    new WebpackNotifierPlugin({alwaysNotify: true}),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery"
    }),
  ]
}
