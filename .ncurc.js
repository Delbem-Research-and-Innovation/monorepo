module.exports = {
  target: (name) => {
    const minorPackages = ['typescript', '@types/node'];

    if (minorPackages.includes(name)) {
      return 'minor';
    }

    return 'latest';
  },
};
