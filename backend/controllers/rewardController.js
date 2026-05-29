exports.listRewards = async (req, res, next) => {
  try {
    res.json({ rewards: [], message: "Rewards list placeholder" });
  } catch (error) {
    next(error);
  }
};

exports.redeemReward = async (req, res, next) => {
  try {
    const { rewardId } = req.params;
    res.json({ message: `Redeem reward ${rewardId} placeholder` });
  } catch (error) {
    next(error);
  }
};
