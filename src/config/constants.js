module.exports = {
	UI: {
		SEPARATOR: '═══════════════════════════════════════════════════════',
		PADDING: '        ',
		SPACE: '   ',
		PROMPT: '        > ',
		NEWLINE: '\n'
	},

	COLORS: {
		RAINBOW: 'rainbow'
	},

	DISCORD: {
		CHANNEL_TYPES: {
			DM: 'DM',
			GUILD_TEXT: 'GUILD_TEXT',
			GUILD_VOICE: 'GUILD_VOICE',
			GUILD_CATEGORY: 'GUILD_CATEGORY',
			GUILD_NEWS: 'GUILD_NEWS',
			GUILD_STAGE_VOICE: 'GUILD_STAGE_VOICE'
		},

		RELATIONSHIP_TYPES: {
			NONE: 0,
			FRIEND: 1,
			BLOCKED: 2,
			PENDING_INCOMING: 3,
			PENDING_OUTGOING: 4
		}
	},

	DELAYS: {
		ROLE_CREATION: 0.3,
		CATEGORY_CREATION: 0.5,
		CHANNEL_CREATION: 0.5,
		EMOJI_CREATION: 0.5,
		STICKER_CREATION: 1,

		DM_CLOSE: 1.3,
		ERROR_RETRY: 1,

		MESSAGE_DISPLAY: 2,
		SHORT_PAUSE: 1,
		LONG_PAUSE: 3
	},

	LIMITS: {
		FETCH_MESSAGES_BATCH: 100,
		DISCORD_SNOWFLAKE_MIN: 17,
		DISCORD_SNOWFLAKE_MAX: 19
	},

	WINDOW_TITLES: {
		MAIN_MENU: 'BrunnoClear | Menu Principal',
		CLONE_SERVER: 'BrunnoClear | Clonar servidor',
		CLEAN_DM: 'BrunnoClear | Limpar DM única',
		CLEAN_DMS: 'BrunnoClear | Limpar DMs abertas',
		REMOVE_FRIENDS: 'BrunnoClear | Remover amigos',
		REMOVE_SERVERS: 'BrunnoClear | Remover servidores',
		CLOSE_DMS: 'BrunnoClear | Fechar DMs',
		CONFIG: 'BrunnoClear | Configuração',
		BACKUP: 'BrunnoClear | Backup de mensagens',
		USER_INFO: 'BrunnoClear | Informações do usuário',
		OPEN_DMS: 'BrunnoClear | Abrir DMs',
		CONNECTING: 'BrunnoClear | Conectando...',
		INITIALIZING: 'BrunnoClear | Inicializando...',
		CONFIGURE_RPC: 'BrunnoClear | Configurar Rich Presence',
		UPDATE_MENU: 'BrunnoClear | Atualizações',
		SELECT_TOKEN: 'BrunnoClear | Selecionar token',
		LOGIN: 'BrunnoClear | Login'
	}
};
