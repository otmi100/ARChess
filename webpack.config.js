const path = require("path");
const fs = require("fs");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "inline-source-map",
  entry: {
    main: "./src/main.ts",
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name]-bundle.js",
  },
  resolve: {
    // Add ".ts" and ".tsx" as resolvable extensions.
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: "ts-loader" },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "./html" }, { from: "./models", to: "./models" }],
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    clientLogLevel: 'debug',
    compress: true,
    host: '0.0.0.0',
    http2: true,
    https: {
      key: fs.readFileSync("/home/mitch/cert/server.key"),
      cert: fs.readFileSync("/home/mitch/cert/server.crt"),
    },
  },
};
