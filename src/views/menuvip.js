import { groupVipCommandsByCategory, getVipStats } from '../utils/vipCommandsManager.js';

/**
 * Gera o menu VIP dinamicamente baseado nos comandos cadastrados
 */
async function menuVIP(prefix, botName = "MeuBot", userName = "Usuário", {
    header = `╭┈⊰ 🫟 『 *${botName}* 』\n┊💭 *Usuário:* #nome#\n┊👑 *Prefixo:* #prefix#\n╰─┈┈┈┈┈┈┈┈┈┈◜❁◞┈┈┈┈┈┈┈┈┈┈─╯`,
    menuTopBorder = "╭┈",
    bottomBorder = "╰─┈┈┈┈┈┈┈┈┈┈◜❁◞┈┈┈┈┈┈┈┈┈┈─╯",
    menuTitleIcon = "🍧ฺꕸ▸",
    menuItemIcon = "•.̇𖥨֗🫟⭟",
    separatorIcon = "❁",
    middleBorder = "┊"
} = {}) {
  try {
    const grouped = groupVipCommandsByCategory();
    const stats = getVipStats();

    let formattedHeader = header
    .replace(/#nome#/g, userName)
    .replace(/#user#/g, userName)
    .replace(/#prefix#/g, prefix);

    let menu = `${formattedHeader}

`;

    if (stats.active === 0) {
      menu += `${menuTopBorder}${separatorIcon} *👑 COMANDOS VIP*
${middleBorder}
${middleBorder}📭 Nenhum comando cadastrado
${middleBorder}
${middleBorder}💡 Dono pode adicionar com:
${middleBorder}${menuItemIcon}${prefix}addcmdvip
${bottomBorder}
`;
      return menu;
    }

    Object.entries(grouped).forEach(([categoryKey, categoryData]) => {
      menu += `${menuTopBorder}${separatorIcon} *${categoryData.label}*\n${middleBorder}\n`;
      categoryData.commands.forEach((cmd) => {
        menu += `${middleBorder}${menuItemIcon}${prefix}${cmd.command}\n`;
      });
      menu += `${bottomBorder}\n\n`;
    });

    menu += `${menuTopBorder}${separatorIcon} *ℹ️ INFORMAÇÕES VIP*
${middleBorder}
${middleBorder}• Comandos: ${stats.active}
${middleBorder}• Categorias: ${stats.categories}
${middleBorder}• ${prefix}infovip
${middleBorder}• ${prefix}dono
${bottomBorder}
`;

    return menu;
  } catch (error) {
    console.error('Erro ao gerar menu VIP:', error);
    return `❌ Erro ao carregar menu VIP.`;
  }
}

export { menuVIP };
