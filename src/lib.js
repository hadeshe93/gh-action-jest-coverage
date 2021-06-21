const core = require('@actions/core');

const getInputers = () => {
  const sourceBranch = core.getInput('source-branch');
  const targetBranch = core.getInput('target-branch');
  return {
    sourceBranch,
    targetBranch,
  };
};

module.exports = {
  getInputers,
};
