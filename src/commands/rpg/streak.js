
export default {
  name: "streak",
  description: "Sistema de streak diário e recompensas",
  commands: ["streak", "serie"],
  usage: "{prefix}streak",
  handle: async ({ 
    reply, 
    isGroup, 
    groupData, 
    sender, 
    prefix, 
    pushname, 
    loadEconomy, 
    saveEconomy, 
    getEcoUser,
    MESSAGES
  }) => {
    if (!isGroup) return reply(MESSAGES.rpg.groupOnly);
    if (!groupData.modorpg) return reply(MESSAGES.rpg.disabled(prefix));
    
    const econ = loadEconomy();
    const me = getEcoUser(econ, sender);

    // Mesmo formato do !daily (count/record/lastClaim)
    if (!me.streak) me.streak = { count: 0, lastClaim: 0, record: 0 };
    me.streak.count = me.streak.count || 0;
    me.streak.lastClaim = me.streak.lastClaim || 0;

    const now = Date.now();
    const oneDay = 86400000;

    if (now - me.streak.lastClaim < oneDay) {
      const remaining = oneDay - (now - me.streak.lastClaim);
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      return reply(MESSAGES.rpg.streak.alreadyClaimed(hours, mins));
    }

    if (now - me.streak.lastClaim < oneDay * 2) {
      me.streak.count++;
    } else {
      me.streak.count = 1;
    }
    if (!me.streak.record || me.streak.count > me.streak.record) me.streak.record = me.streak.count;

    const reward = 1000 + (me.streak.count * 500);
    me.wallet += reward;
    me.streak.lastClaim = now;

    saveEconomy(econ);
    return reply(MESSAGES.rpg.streak.claimed(me.streak.count, reward.toLocaleString()));
  }
};
