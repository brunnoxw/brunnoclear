const { obterConfig } = require('../config/configuracao');

/**
 * Busca todas as mensagens de um canal
 * @param {Object} cliente - Cliente do Discord
 * @param {string} idCanal - ID do canal
 * @param {Function} onProgress - Callback opcional (totalBuscadas, totalFiltradas)
 * @returns {Promise<Array>} - Array de mensagens filtradas
 */
async function buscarTodasMensagens(cliente, idCanal, onProgress = null) {
	let canal = cliente.channels.cache.get(idCanal);

	if (!canal) {
		try {
			canal = await cliente.channels.fetch(idCanal);
		} catch (e) {
			return [];
		}
	}

	if (!canal) {
		return [];
	}

	let ultimoId;
	let mensagens = [];
	let totalMensagens = 0;

	while (true) {
		const buscadas = await canal.messages.fetch({
			limit: 100,
			...(ultimoId && { before: ultimoId })
		});

		if (buscadas.size === 0) {
			const filtradas = mensagens.filter((msg) => msg.author.id === cliente.user.id && !msg.system);
			return filtradas;
		}

		totalMensagens += buscadas.size;

		const mensagensBuscadas = Array.from(buscadas.values());
		mensagens = mensagens.concat(mensagensBuscadas);

		if (onProgress) {
			const totalFiltradas = mensagens.filter((msg) => msg.author.id === cliente.user.id && !msg.system).length;
			onProgress(totalMensagens, totalFiltradas);
		}

		ultimoId = buscadas.lastKey();
	}
}

/**
 * Busca TODAS as mensagens de um canal (sem filtro de autor) - Para backup
 * @param {Object} cliente - Cliente do Discord
 * @param {string} idCanal - ID do canal
 * @param {Function} onProgress - Callback opcional (totalBuscadas)
 * @returns {Promise<Array>} - Array de TODAS as mensagens
 */
async function buscarTodasMensagensParaBackup(cliente, idCanal, onProgress = null) {
	let canal = cliente.channels.cache.get(idCanal);

	if (!canal) {
		try {
			canal = await cliente.channels.fetch(idCanal);
		} catch (e) {
			return [];
		}
	}

	if (!canal) {
		return [];
	}

	let ultimoId;
	let mensagens = [];
	let totalMensagens = 0;

	while (true) {
		const buscadas = await canal.messages.fetch({
			limit: 100,
			...(ultimoId && { before: ultimoId })
		});

		if (buscadas.size === 0) {
			return mensagens.filter((msg) => !msg.system);
		}

		totalMensagens += buscadas.size;

		const mensagensBuscadas = Array.from(buscadas.values());
		mensagens = mensagens.concat(mensagensBuscadas);

		if (onProgress) {
			onProgress(totalMensagens);
		}

		ultimoId = buscadas.lastKey();
	}
}

/**
 * Busca mensagens de forma incremental (sem esperar tudo)
 * @param {Object} canal - Canal do Discord
 * @param {Function} callback - Função executada para cada lote de mensagens
 * @param {Object} cliente - Cliente do Discord
 */
async function buscarMensagensIncremental(canal, callback, cliente) {
	let ultimoId;
	let totalFiltradas = 0;

	while (true) {
		const buscadas = await canal.messages.fetch({
			limit: 100,
			...(ultimoId && { before: ultimoId })
		});

		if (buscadas.size === 0) {
			break;
		}

		const mensagensFiltradas = Array.from(buscadas.values()).filter(
			(msg) => msg.author.id === cliente.user.id && !msg.system
		);

		totalFiltradas += mensagensFiltradas.length;

		if (callback) {
			await callback(mensagensFiltradas, totalFiltradas);
		}

		ultimoId = buscadas.lastKey();
	}

	return totalFiltradas;
}

/**
 * Abre uma DM com um usuário
 * @param {Object} cliente - Cliente do Discord
 * @param {string} idUsuario - ID do usuário
 * @returns {Promise<Object|null>} - Canal DM ou null
 */
async function abrirDM(cliente, idUsuario) {
	try {
		const usuario = await cliente.users.fetch(idUsuario);
		if (!usuario) {
			return null;
		}

		const dm = await usuario.createDM();
		return dm;
	} catch (erro) {
		console.error('Erro ao abrir DM:', erro.message);
		return null;
	}
}

/**
 * Obtém informações de um usuário
 * @param {Object} cliente - Cliente do Discord
 * @param {string} idUsuario - ID do usuário
 * @returns {Promise<Object|null>}
 */
async function obterInfoUsuario(cliente, idUsuario) {
	try {
		const usuario = await cliente.users.fetch(idUsuario);
		if (!usuario) {
			return null;
		}

		return {
			id: usuario.id,
			nome: usuario.username,
			nomeGlobal: usuario.globalName,
			discriminador: usuario.discriminator,
			avatar: usuario.displayAvatarURL({ dynamic: true, size: 1024 }),
			bot: usuario.bot,
			criadoEm: usuario.createdAt
		};
	} catch (erro) {
		console.error('Erro ao obter informações do usuário:', erro.message);
		return null;
	}
}

/**
 * Lista todos os relacionamentos (amigos, bloqueados, etc)
 * @param {Object} cliente - Cliente do Discord
 * @param {number} tipo - Tipo de relacionamento (1 = amigo, 2 = bloqueado, etc)
 * @returns {Array}
 */
function listarRelacionamentos(cliente, tipo) {
	try {
		return cliente.relationships.cache.filter((valor) => valor === tipo).map((valor, chave) => chave);
	} catch (erro) {
		console.error('Erro ao listar relacionamentos:', erro.message);
		return [];
	}
}

/**
 * Lista todas as DMs abertas
 * @param {Object} cliente - Cliente do Discord
 * @returns {Array}
 */
function listarDMsAbertas(cliente) {
	try {
		return cliente.channels.cache.filter((c) => c.type === 'DM').map((canal) => canal);
	} catch (erro) {
		console.error('Erro ao listar DMs:', erro.message);
		return [];
	}
}

/**
 * Lista todos os servidores
 * @param {Object} cliente - Cliente do Discord
 * @returns {Array}
 */
function listarServidores(cliente) {
	try {
		return cliente.guilds.cache.map((servidor) => servidor);
	} catch (erro) {
		console.error('Erro ao listar servidores:', erro.message);
		return [];
	}
}

module.exports = {
	buscarTodasMensagens,
	buscarTodasMensagensParaBackup,
	buscarMensagensIncremental,
	abrirDM,
	obterInfoUsuario,
	listarRelacionamentos,
	listarDMsAbertas,
	listarServidores
};
