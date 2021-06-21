const { getInputers } = require('../src/lib');

describe('测试集', () => {
  it('测试 getInputers', () => {
    const { sourceBranch, targetBranch } = getInputers();
    expect(sourceBranch).toBe('');
    expect(targetBranch).toBe('');
  });
});
