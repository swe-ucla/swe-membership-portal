module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable CSS minification
      const miniCssExtractPlugin = webpackConfig.plugins.find(
        plugin => plugin.constructor.name === 'MiniCssExtractPlugin'
      );
      
      if (miniCssExtractPlugin) {
        miniCssExtractPlugin.options.ignoreOrder = true;
      }

      // Find and disable CSS minimizer
      if (webpackConfig.optimization && webpackConfig.optimization.minimizer) {
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.filter(
          minimizer => minimizer.constructor.name !== 'CssMinimizerPlugin'
        );
      }

      return webpackConfig;
    }
  }
};