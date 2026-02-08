require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// ===== CONFIG (.env) =====
const {
  TOKEN,
  GUILD_ID,
  VERIFY_CHANNEL_ID,
  LOG_CHANNEL_ID,
  ROLE_TO_GIVE_ID,
  STAFF_ROLE_IDS,
  TICKET_CATEGORY_ID,
} = process.env;

const STAFF_ROLES = [...new Set(
  (STAFF_ROLE_IDS || "").split(",").map(r => r.trim()).filter(Boolean)
)];

// ===== COOLDOWN =====
const COOLDOWN_MINUTES = 10; // altere aqui
const verifyCooldown = new Map(); // userId -> timestamp

// ===== FIXOS =====
const INVITE_LINK = "https://discord.com/invite/DbeGdqvwan";
const BANNER_IMAGE =
  "https://media.discordapp.net/attachments/1130651425228210219/1469413999266369647/Horizon_Family.gif";
const SUPPORT_CHANNEL_ID = "1468634006743683266";

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // opcional, mas deixa o "alerta de print" funcionar
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ===== HELPERS =====
function isStaff(member) {
  return STAFF_ROLES.some(roleId => member.roles.cache.has(roleId));
}

async function sendLog(guild, embed) {
  if (!LOG_CHANNEL_ID) return;
  const logCh = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logCh) return;
  try {
    await logCh.send({ embeds: [embed] });
  } catch {}
}

// Procura se já existe ticket aberto do usuário
function findOpenTicketChannel(guild, userId) {
  return guild.channels.cache.find((c) => {
    if (c.type !== ChannelType.GuildText) return false;
    if (!c.name?.startsWith("verificacao-")) return false;
    return c.permissionOverwrites.cache.has(userId);
  });
}

// ===== EMBED PRINCIPAL (TEXTO EXATO, COM ESPAÇAMENTO PRESERVADO) =====
function buildVerifyEmbed() {
  return new EmbedBuilder()
    .setTitle("💕 Fᴀᴍíʟɪᴀ Hᴏʀɪᴢᴏɴ Hᴜʙ")
    .setDescription(`Oʟá, Mᴇᴍʙʀᴏ(ᴀ)! Dᴇꜱᴇᴊᴀ ꜰᴀᴢᴇʀ ᴘᴀʀᴛᴇ ᴅᴀ ɴᴏꜱꜱᴀ ꜰᴀᴍíʟɪᴀ?
Pᴀʀᴀ ɪꜱꜱᴏ, ʙᴀꜱᴛᴀ ᴀᴅɪᴄɪᴏɴᴀʀ ᴏ ʟɪɴᴋ ᴅᴏ ꜱᴇʀᴠɪᴅᴏʀ ɴᴀ ꜱᴜᴀ ʙɪᴏ ᴅᴏ ᴅɪꜱᴄᴏʀᴅ:

"${INVITE_LINK}"

Aᴏ ᴄᴏʟᴏᴄᴀʀ ᴏ ʟɪɴᴋ ɴᴀ ꜱᴜᴀ ʙɪᴏ, ᴠᴏᴄê ᴛᴇʀá ᴀꜱ ꜱᴇɢᴜɪɴᴛᴇꜱ ᴠᴀɴᴛᴀɢᴇɴꜱ ɴᴏ ꜱᴇʀᴠɪᴅᴏʀ: ⤵

<a:b_seta:1469330862439928113> Pᴇʀᴍɪꜱꜱãᴏ ᴘᴀʀᴀ ᴇɴᴠɪᴀʀ ɪᴍᴀɢᴇɴꜱ ᴇ ʟɪɴᴋꜱ ɴᴀ ᴄᴀᴛᴇɢᴏʀɪᴀ **Gᴇʀᴀʟ**. 🖼️

<a:b_seta:1469330862439928113> 2x XP ɴᴀ Lᴏʀɪᴛᴛᴀ. 🆙

<a:b_seta:1469330862439928113> Aᴄᴇꜱꜱᴏ ᴀᴏ ᴄʜᴀᴛ Bᴀɢᴜɴçᴀ, ᴏɴᴅᴇ ᴏ Aᴜᴛᴏᴍᴏᴅ é ᴅᴇꜱᴀᴛɪᴠᴀᴅᴏ.

<a:b_seta:1469330862439928113> Cᴀʀɢᴏ ᴅᴇꜱᴛᴀᴄᴀᴅᴏ ᴇᴍ ʀᴇʟᴀçãᴏ ᴀᴏs ᴅᴇᴍᴀɪꜱ ᴍᴇᴍʙʀᴏꜱ: <@&${ROLE_TO_GIVE_ID}>

<a:b_seta:1469330862439928113> Iᴍᴜɴɪᴅᴀᴅᴇ ᴇᴍ ᴅᴇᴛᴇʀᴍɪɴᴀᴅᴏꜱ ꜱᴏʀᴛᴇɪᴏꜱ ᴅᴇ ꜱᴏɴʜᴏꜱ, ᴘɪx, ɢɪꜰᴛ ᴄᴀʀᴅ, ɴɪᴛʀᴏ, ᴇɴᴛʀᴇ ᴏᴜᴛʀᴏꜱ.

✬ Aᴘóꜱ ᴄᴏʟᴏᴄᴀʀ ᴏ ʟɪɴᴋ ᴅᴏ ꜱᴇʀᴠɪᴅᴏʀ ɴᴀ ꜱᴜᴀ Bɪᴏ, ᴄʟɪqᴜᴇ ɴᴏ ʙᴏᴛãᴏ “**Vᴇʀɪꜰɪᴄᴀʀ**” Qᴜᴇ ᴜᴍᴀ ᴊᴀɴᴇʟᴀ ᴅᴇ ᴛɪᴄᴋᴇᴛ ꜱᴇ ᴀʙʀɪʀá ᴘᴀʀᴀ ᴘʀᴏꜱꜱᴇɢᴜɪʀ ᴄᴏᴍ ᴀ ᴀᴅᴇꜱãᴏ ᴅᴏ ᴄᴀʀɢᴏ..

Cᴀꜱᴏ ᴀʟɢᴏ ᴅê ᴇʀʀᴀᴅᴏ, ᴀʙʀᴀ ᴜᴍ ᴛɪᴄᴋᴇᴛ ᴇᴍ <#${SUPPORT_CHANNEL_ID}> ᴇ ꜱᴇʟᴇᴄɪᴏɴᴇ ᴀ ᴏᴘçãᴏ "**Fᴀᴍíʟɪᴀ**"`)

    .setColor("#df0000")
    .setImage(BANNER_IMAGE)
    .setFooter({ text: "Hᴏʀɪᴢᴏɴ Hᴜʙ™ • Sɪꜱᴛᴇᴍᴀ ᴅᴇ Vᴇʀɪꜰɪᴄᴀçãᴏ" });
}

function buildVerifyRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_verify")
      .setLabel("Vᴇʀɪꜰɪᴄᴀʀ")
      .setEmoji("<a:emoji_76:1469541799952384092>")
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildStaffRow(ticketOwnerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve:${ticketOwnerId}`)
      .setLabel("Aᴘʀᴏᴠᴀʀ")
      .setEmoji("<a:854381884397584405:1469540223707779308>")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`deny:${ticketOwnerId}`)
      .setLabel("Nᴇɢᴀʀ")
      .setEmoji("<a:sevgiliyapmyorum:1469540049204019362>")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`close:${ticketOwnerId}`)
      .setLabel("Fᴇᴄʜᴀʀ")
      .setEmoji("<a:limpeza:1469552880599175279>")
      .setStyle(ButtonStyle.Secondary)
  );
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ Lᴏɢᴀᴅᴏ Cᴏᴍᴏ ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  if (!guild) return console.log("❌ GUILD_ID Iɴᴠáʟɪᴅᴏ ᴏᴜ ʙᴏᴛ ɴÃᴏ ᴇꜱᴛá ɴᴏ ꜱᴇʀᴠɪᴅᴏʀ.");

  const channel = await guild.channels.fetch(VERIFY_CHANNEL_ID).catch(() => null);
  if (!channel) return console.log("❌ VERIFY_CHANNEL_ID Iɴᴠáʟɪᴅᴏ.");

  // Envia embed principal
  await channel.send({ embeds: [buildVerifyEmbed()], components: [buildVerifyRow()] });
  console.log("📨 Eᴍʙᴇᴅ ᴅᴇ ᴠᴇʀɪꜰɪᴄᴀçãᴏ Eɴᴠɪᴀᴅᴀ.");
  

});

// ===== INTERACTIONS =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const guild = interaction.guild;
  if (!guild) return;

  // =======================
  // BOTÃO: START VERIFY
  // =======================
  if (interaction.customId === "start_verify") {
    // Responde rápido para não falhar (ephemeral)
    // (vamos continuar o processo depois)
    await interaction.deferReply({ ephemeral: true }).catch(() => null);

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.editReply("❌ Nãᴏ ᴄᴏɴꜱᴇɢᴜɪ ʟᴏᴄᴀʟɪᴢᴀʀ ᴠᴏᴄê ɴᴏ ꜱᴇʀᴠɪᴅᴏʀ.");

    // 1) Já tem ticket aberto?
    const existing = findOpenTicketChannel(guild, interaction.user.id);
    if (existing) {
      return interaction.editReply(`⚠️ Vᴏᴄê ᴊá ᴛᴇᴍ ᴜᴍ Tɪᴄᴋᴇᴛ ᴀʙᴇʀᴛᴏ: <#${existing.id}>`);
    }

    // 2) Cooldown
    const now = Date.now();
    const cooldownTime = COOLDOWN_MINUTES * 60 * 1000;
    const lastUse = verifyCooldown.get(interaction.user.id);

    if (lastUse && now - lastUse < cooldownTime) {
      const remaining = cooldownTime - (now - lastUse);
      const minutes = Math.ceil(remaining / 60000);
      return interaction.editReply(`⏳ Vᴏᴄê ᴊá ɪɴɪᴄɪᴏᴜ ᴜᴍᴀ ᴠᴇʀɪꜰɪᴄᴀçãᴏ ʀᴇᴄᴇɴᴛᴇᴍᴇɴᴛᴇ.\nTᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ ᴇᴍ **${minutes} minuto(s)**.`);
    }

    verifyCooldown.set(interaction.user.id, now);

    // 3) Criar ticket
    const rawName = `FamilyHorizon™-${interaction.user.username}`.toLowerCase();
    const safeName = rawName.replace(/[^a-z0-9\-]/g, "").slice(0, 90);

    const ticketChannel = await guild.channels.create({
      name: safeName || `verificacao-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID || null,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
          ],
        },
        ...STAFF_ROLES.map((roleId) => ({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ManageMessages,
          ],
        })),
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageMessages,
          ],
        },
      ],
    });

    const ticketEmbed = new EmbedBuilder()
      .setTitle("📌 Eɴᴠɪᴇ ᴀ ᴘʀᴏᴠᴀ ᴅᴀ ᴅɪᴠᴜʟɢᴀçãᴏ")
      .setDescription(
        [
          `Oʟá <@${interaction.user.id}>!`,
          "",
          "📸 Eɴᴠɪᴇ **ᴜᴍ ᴘʀɪɴᴛ ᴅᴏ ꜱᴇᴜ ᴘᴇʀꜰɪʟ** ᴍᴏꜱᴛʀᴀɴᴅᴏ qᴜᴇ ᴠᴏᴄê ᴄᴏʟᴏᴄᴏᴜ ᴏ ʟɪɴᴋ ɴᴀ ʙɪᴏ/ꜱᴏʙʀᴇ ᴍɪᴍ:",
          `**${INVITE_LINK}**`,
          "",
          "Dᴇᴘᴏɪs qᴜᴇ ᴠᴏᴄê ᴇɴᴠɪᴀʀ ᴏ ᴘʀɪɴᴛ, ᴀ Sᴛᴀꜰꜰ ᴘᴏᴅᴇʀá **Aᴘʀᴏᴠᴀʀ** ᴏᴜ **Nᴇɢᴀʀ**.",
        ].join("\n")
      )
      .setColor("#87cefa");

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [ticketEmbed],
      components: [buildStaffRow(interaction.user.id)],
    });
	
	// ===== LOG: TICKET CRIADO =====
const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
if (logChannel) {
  const logEmbed = new EmbedBuilder()
    .setTitle("📂 Tɪᴄᴋᴇᴛ ᴅᴇ ᴠᴇʀɪꜰɪᴄᴀçãᴏ ᴄʀɪᴀᴅᴏ")
    .setDescription(
      [
        `👤 Uꜱᴜáʀɪᴏ: <@${interaction.user.id}>`,
        `🆔 ID: ${interaction.user.id}`,
        `📁 Cᴀɴᴀʟ: <#${ticketChannel.id}>`,
        `🕒 Dᴀᴛᴀ: <t:${Math.floor(Date.now() / 1000)}:F>`
      ].join("\n")
    )
    .setColor("#a29ced");

  logChannel.send({ embeds: [logEmbed] }).catch(() => {});
}

    return interaction.deleteReply().catch(() => {});
  }

  // =======================
  // STAFF ACTIONS
  // =======================
  const [action, ownerId] = interaction.customId.split(":");
  if (!["approve", "deny", "close"].includes(action)) return;

  const staffMember = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!staffMember || !isStaff(staffMember)) {
    return interaction.reply({ content: "❌ ᴠᴏᴄê ɴãᴏ ᴛᴇᴍ ᴘᴇʀᴍɪꜱꜱãᴏ ᴘᴀʀᴀ ɪꜱꜱᴏ.", ephemeral: true });
  }

  const ownerMember = await guild.members.fetch(ownerId).catch(() => null);
  if (!ownerMember) {
    return interaction.reply({ content: "❌ Nãᴏ ᴇɴᴄᴏɴᴛʀᴇɪ ᴏ ᴜꜱᴜáʀɪᴏ ᴅᴏɴᴏ ᴅᴏ Tɪᴄᴋᴇᴛ.", ephemeral: true });
  }

  if (action === "approve") {
  const role = guild.roles.cache.get(ROLE_TO_GIVE_ID);

  // ❌ ERRO: cargo não encontrado (com emoji animado)
  if (!role) {
    const errorEmbed = new EmbedBuilder()
      .setTitle("**Eʀʀᴏ ɴᴀ Vᴇʀɪꜰɪᴄᴀçãᴏ**")
      .setDescription(
        "<a:sevgiliyapmyorum:1469540049204019362> O Cᴀʀɢᴏ ᴄᴏɴꜰɪɢᴜʀᴀᴅᴏ **Nãᴏ ꜰᴏɪ Eɴᴄᴏɴᴛʀᴀᴅᴏ**.\n" +
        "<a:land_hype:1469546461460041728> Iɴꜰᴏʀᴍᴇ ᴀ **Sᴛᴀꜰꜰ ʀᴇsᴘᴏɴsáᴠᴇʟ**."
      )
      .setColor("#ff0000");

    return interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true
    });
  }

  // 🔑 AQUI O USUÁRIO GANHA O CARGO (PARTE MAIS IMPORTANTE)
  await ownerMember.roles.add(role).catch(() => null);

  // ✅ EMBED DE APROVAÇÃO (bonita, com emoji animado)
  const approveEmbed = new EmbedBuilder()
    .setTitle("**Vᴇʀɪꜰɪᴄᴀçãᴏ Aᴘʀᴏᴠᴀᴅᴀ**")
    .setDescription(
      "<a:854381884397584405:1469540223707779308> A Vᴇʀɪꜰɪᴄᴀçãᴏ ꜰᴏɪ **Aᴘʀᴏᴠᴀᴅᴀ ᴄᴏᴍ Sᴜᴄᴇꜱꜱᴏ**!\n" +
      "<a:emoji_76:1469541799952384092> Sᴇᴊᴀ Bᴇᴍ-Vɪɴᴅᴏ(ᴀ) á **Hᴏʀɪᴢᴏɴ Fᴀᴍɪʟʏ** 💕"
    )
    .setColor("#7cfc00");

  await interaction.reply({
    embeds: [approveEmbed]
  });

// 🧾 LOG (opcional)
if (LOG_CHANNEL_ID) {
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setTitle("Lᴏɢ • Vᴇʀɪꜰɪᴄᴀçãᴏ Aᴘʀᴏᴠᴀᴅᴀ")
      .setDescription(
        `👤 Uꜱᴜáʀɪᴏ: <@${ownerId}>\n` +
        `🎖 Cᴀʀɢᴏ: <@&${ROLE_TO_GIVE_ID}>\n` +
        `👮 Sᴛᴀꜰꜰ: <@${interaction.user.id}>`
      )
      .setColor("#7cfc00");

    logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  }
}

  return;
}

  if (action === "deny") {
  // ❌ EMBED DE NEGADO (com emoji animado na descrição)
  const denyEmbed = new EmbedBuilder()
    .setTitle("**Vᴇʀɪꜰɪᴄᴀçãᴏ Nᴇɢᴀᴅᴀ**")
    .setDescription(
      "<a:sevgiliyapmyorum:1469540049204019362> A Vᴇʀɪꜰɪᴄᴀçãᴏ ꜰᴏɪ Nᴇɢᴀᴅᴀ ᴘᴇʟᴀ Sᴛᴀꜰꜰ.\n" +
      "<a:land_hype:1469546461460041728> Vᴇʀɪꜰɪqᴜᴇ ꜱᴇ ᴏ ʟɪɴᴋ ᴇꜱᴛá ᴄᴏʀʀᴇᴛᴀᴍᴇɴᴛᴇ ɴᴀ ꜱᴜᴀ ʙɪᴏ ᴇ ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ."
    )
    .setColor("#ff0000");

  await interaction.reply({
    embeds: [denyEmbed]
  });

  // 🧾 LOG (opcional)
  if (LOG_CHANNEL_ID) {
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("Lᴏɢ • Vᴇʀɪꜰɪᴄᴀçãᴏ Nᴇɢᴀᴅᴀ")
        .setDescription(
          `👤 Uꜱᴜáʀɪᴏ: <@${ownerId}>\n` +
          `👮 Sᴛᴀꜰꜰ: <@${interaction.user.id}>`
        )
        .setColor("#ff0000");

      logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  return;
}


if (action === "close") {
  verifyCooldown.delete(ownerId);

  const closeEmbed = new EmbedBuilder()
    .setTitle("**Fᴇᴄʜᴀɴᴅᴏ Tɪᴄᴋᴇᴛ**")
    .setDescription(
      "<a:limpeza:1469552880599175279> O Tɪᴄᴋᴇᴛ ꜱᴇʀá **Fᴇᴄʜᴀᴅᴏ ᴇᴍ Iɴꜱᴛᴀɴᴛᴇꜱ**.\n" +
      "<a:emoji_76:1469541799952384092> Oʙʀɪɢᴀᴅᴏ ᴘᴇʟᴀ Cᴏʟᴀʙᴏʀᴀçãᴏ."
    )
    .setColor("#ffffff");

  // ✅ ENVIA NO CANAL DO TICKET (USUÁRIO VÊ)
  await interaction.channel.send({ embeds: [closeEmbed] }).catch(() => {});

  // ⏳ AGUARDA ANTES DE FECHAR
  setTimeout(async () => {
    try {
      await interaction.channel.delete("Tɪᴄᴋᴇᴛ Fᴇᴄʜᴀᴅᴏ ᴘᴇʟᴀ Sᴛᴀꜰꜰ");
    } catch {}
  }, 5000); // 5 segundos (ajuste se quiser)

  // ⚠️ RESPONDE A INTERAÇÃO (para não dar erro)
  await interaction.deferUpdate().catch(() => {});

  return;
}

});

// ===== DETECTA PRINT/ANEXO NO TICKET E AVISA STAFF =====
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.channel?.name?.startsWith("verificacao-")) return;

  if (message.attachments.size > 0) {
    const embed = new EmbedBuilder()
  .setTitle("**Pʀᴏᴠᴀ Eɴᴠɪᴀᴅᴀ**")
  .setDescription(
    `<a:emoji_38:1469551023235272808> O Uꜱᴜáʀɪᴏ <@${message.author.id}> Eɴᴠɪᴏᴜ ᴜᴍ Aɴᴇxᴏ.\n` +
    `<a:land_hype:1469546461460041728> Sᴛᴀꜰꜰ ᴘᴏᴅᴇ Rᴇᴠɪꜱᴀʀ ᴇ Aᴘʀᴏᴠᴀʀ.`
  )
  .setColor("#7e7e7e");

    const mentions = STAFF_ROLES.map((id) => `<@&${id}>`).join(" ");
    await message.channel.send({ content: mentions || null, embeds: [embed] }).catch(() => null);
  }
});

client.login(TOKEN);
