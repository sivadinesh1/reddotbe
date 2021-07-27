const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

const { NODE_ENV = 'production' } = process.env;
module.exports = {
	entry: './index.js',
	mode: NODE_ENV,
	target: 'node',
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: 'index.js',
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.js$/i,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ from: './upload', to: 'upload' }],
		}),
	],

	externals: [nodeExternals()],
};
