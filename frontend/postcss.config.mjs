export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: {
      preset: ['default', {
        discardComments: {
          removeAll: true,
        },
        normalizeWhitespace: true,
        minifySelectors: true,
        minifyParams: true,
        minifyFontValues: true,
        minifyGradients: true,
        minifyTimingFunctions: true,
        minifyTransforms: true,
        mergeLonghand: true,
        mergeRules: true,
        normalizeUrl: true,
        orderedValues: true,
        reduceIdents: true,
        reduceInitial: true,
        reduceTransforms: true,
        svgo: true,
        uniqueSelectors: true,
        zindex: false,
      }],
    },
  },
}
