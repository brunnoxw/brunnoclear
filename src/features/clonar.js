const readlineSync = require('readline-sync');
const { obterConfig } = require('../config/configuracao');
const { sleep } = require('../utils/sleep');
const { exibirTitulo } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { Cores, Simbolos, textoRainbow } = require('../utils/cores');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Exibe o progresso atual da clonagem
 */
function exibirProgresso(cliente, corPrincipal, etapa, descricao) {
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          CLONANDO SERVIDOR', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo(descricao, corPrincipal);
	UIComponents.exibirLinhaVazia();
}

/**
 * Obtém o tipo MIME baseado na extensão do arquivo
 */
function obterMimeType(extensao) {
	const mimeTypes = {
		apng: 'image/apng',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif'
	};
	const ext = extensao.trim().toLowerCase().replace('.', '');
	return mimeTypes[ext] || 'image/png';
}

function clonarPermissoes(canalOriginal, cargosMap) {
	const overwrites = [];

	for (const overwrite of canalOriginal.permissionOverwrites.cache.values()) {
		if (overwrite.type === 'role' && cargosMap.has(overwrite.id)) {
			overwrites.push({
				id: cargosMap.get(overwrite.id).id,
				allow: overwrite.allow.bitfield,
				deny: overwrite.deny.bitfield,
				type: 'role'
			});
		} else if (overwrite.type === 'member') {
			overwrites.push({
				id: overwrite.id,
				allow: overwrite.allow.bitfield,
				deny: overwrite.deny.bitfield,
				type: 'member'
			});
		}
	}

	return overwrites;
}

/**
 * Clona um servidor completo (canais, cargos, emojis, stickers, permissões)
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function clonarServidor(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.CLONE_SERVER);

	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          CLONAR SERVIDOR', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Digite o ID do servidor original:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const idOriginal = readlineSync.question(UIComponents.obterPrompt());
	const servidorOriginal = cliente.guilds.cache.get(idOriginal);

	if (!servidorOriginal) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem('Servidor original não encontrado!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
		return;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          SERVIDOR DE DESTINO', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Digite o ID do servidor de destino:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const idDestino = readlineSync.question(UIComponents.obterPrompt());
	const servidorDestino = cliente.guilds.cache.get(idDestino);

	if (!servidorDestino) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem('Servidor de destino não encontrado!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
		return;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          CONFIRMAÇÃO', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirAviso('ATENÇÃO!', corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(
		`        Isso irá ${UIComponents.textoColorido('APAGAR TUDO', corPrincipal, false)} do servidor de destino:`
	);
	console.log(`        ${UIComponents.textoColorido(servidorDestino.name, corPrincipal, false)}`);
	UIComponents.exibirLinhaVazia();

	const totalCargos = servidorOriginal.roles.cache.filter((r) => r.name !== '@everyone').size;
	const totalCategorias = servidorOriginal.channels.cache.filter((c) => c.type === 'GUILD_CATEGORY').size;
	const totalCanais =
		servidorOriginal.channels.cache.filter((c) => c.type === 'GUILD_TEXT').size +
		servidorOriginal.channels.cache.filter((c) => c.type === 'GUILD_VOICE').size;
	const totalEmojis = servidorOriginal.emojis.cache.size;

	const estatisticas = `${totalCargos} CARGOS | ${totalCategorias} CATEGORIAS | ${totalCanais} CANAIS | ${totalEmojis} EMOJIS`;
	UIComponents.exibirInfo(estatisticas, corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Tenho certeza, continuar', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Cancelar e voltar', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const confirmacao = readlineSync.question(UIComponents.obterPrompt());
	if (confirmacao !== '1') {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Operação cancelada.', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          CLONANDO SERVIDOR', corPrincipal);
	UIComponents.exibirLinhaVazia();

	let errosEncontrados = 0;
	let sucessos = {
		cargos: 0,
		categorias: 0,
		canaisTexto: 0,
		canaisVoz: 0,
		stickers: 0,
		emojis: 0
	};
	try {
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Preparando...'
		});
		exibirProgresso(cliente, corPrincipal, '1/12', 'Carregando dados do servidor...');

		try {
			await servidorOriginal.channels.fetch();
		} catch (error) {}

		try {
			await servidorOriginal.roles.fetch();
		} catch (error) {}

		try {
			await servidorOriginal.emojis.fetch();
		} catch (error) {}

		exibirProgresso(cliente, corPrincipal, '1/12', 'Buscando stickers...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Buscando stickers...',
			imagemPequenaTexto: 'Etapa 1/12'
		});
		try {
			await servidorOriginal.stickers.fetch();
		} catch (error) {
			errosEncontrados++;
		}
		const stickers = Array.from(servidorOriginal.stickers.cache, ([, value]) => value);

		exibirProgresso(cliente, corPrincipal, '2/12', 'Atualizando informações básicas...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Informações básicas...',
			imagemPequenaTexto: 'Etapa 2/12'
		});
		try {
			await servidorDestino.setName(servidorOriginal.name);
			await servidorDestino.setIcon(servidorOriginal.iconURL() || null);
			if (servidorOriginal.premiumSubscriptionCount > 0) {
				await servidorDestino.setBanner(servidorOriginal.bannerURL() || null);
			}
		} catch (error) {
			errosEncontrados++;
		}

		exibirProgresso(cliente, corPrincipal, '3/12', 'Removendo emojis existentes...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Removendo emojis...',
			imagemPequenaTexto: 'Etapa 3/12'
		});
		for (const emoji of servidorDestino.emojis.cache.values()) {
			try {
				await emoji.delete();
			} catch (error) {
				errosEncontrados++;
			}
		}

		exibirProgresso(cliente, corPrincipal, '4/12', 'Removendo stickers existentes...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Removendo stickers...',
			imagemPequenaTexto: 'Etapa 4/12'
		});
		try {
			await servidorDestino.stickers.fetch();
		} catch (error) {
			errosEncontrados++;
		}

		for (const sticker of servidorDestino.stickers.cache.values()) {
			try {
				await sticker.delete();
			} catch (error) {
				errosEncontrados++;
			}
		}

		exibirProgresso(cliente, corPrincipal, '5/12', 'Removendo canais existentes...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Removendo canais...',
			imagemPequenaTexto: 'Etapa 5/12'
		});
		for (const canal of servidorDestino.channels.cache.values()) {
			try {
				await canal.delete();
			} catch (error) {
				errosEncontrados++;
			}
		}

		exibirProgresso(cliente, corPrincipal, '6/12', 'Removendo cargos existentes...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Removendo cargos...',
			imagemPequenaTexto: 'Etapa 6/12'
		});
		const cargosParaDeletar = servidorDestino.roles.cache.filter((r) => r.name !== '@everyone');
		for (const cargo of cargosParaDeletar.values()) {
			try {
				await cargo.delete();
			} catch (error) {
				errosEncontrados++;
			}
		}

		exibirProgresso(cliente, corPrincipal, '7/12', 'Criando cargos com permissões...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Criando cargos...',
			imagemPequenaTexto: 'Etapa 7/12'
		});
		const cargosMap = new Map();
		const everyoneOriginal = servidorOriginal.roles.cache.find((r) => r.name === '@everyone');
		const everyoneDestino = servidorDestino.roles.cache.find((r) => r.name === '@everyone');
		if (everyoneOriginal && everyoneDestino) {
			cargosMap.set(everyoneOriginal.id, everyoneDestino);
		}

		const cargosOriginais = servidorOriginal.roles.cache
			.filter((r) => r.name !== '@everyone')
			.sort((a, b) => b.position - a.position);

		let cargosCriados = 0;
		for (const cargo of cargosOriginais.values()) {
			try {
				const novoCargo = await servidorDestino.roles.create({
					name: cargo.name,
					colors: [cargo.color || 0],
					hoist: cargo.hoist,
					mentionable: cargo.mentionable,
					permissions: cargo.permissions.bitfield
				});
				if (novoCargo) {
					cargosMap.set(cargo.id, novoCargo);
					cargosCriados++;

					await sleep(0.3);
				}
			} catch (error) {
				errosEncontrados++;

				await sleep(1);
			}
		}

		exibirProgresso(cliente, corPrincipal, '8/12', 'Criando categorias...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Criando categorias...',
			imagemPequenaTexto: 'Etapa 8/12'
		});
		const categoriasMap = new Map();
		const categorias = servidorOriginal.channels.cache
			.filter((c) => c.type === 'GUILD_CATEGORY')
			.sort((a, b) => a.position - b.position);

		let categoriasCriadas = 0;
		for (const categoria of categorias.values()) {
			try {
				const novaCategoria = await servidorDestino.channels.create(categoria.name, {
					type: 'GUILD_CATEGORY',
					permissionOverwrites: clonarPermissoes(categoria, cargosMap)
				});
				if (novaCategoria) {
					categoriasMap.set(categoria.id, novaCategoria);
					categoriasCriadas++;

					await sleep(0.5);
				}
			} catch (error) {
				errosEncontrados++;
				await sleep(1);
			}
		}

		exibirProgresso(cliente, corPrincipal, '9/12', 'Criando canais de texto...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Criando canais texto...',
			imagemPequenaTexto: 'Etapa 9/12'
		});
		const canaisTexto = servidorOriginal.channels.cache
			.filter((c) => c.type === 'GUILD_TEXT')
			.sort((a, b) => a.position - b.position);

		let canaisTextoCriados = 0;
		for (const canal of canaisTexto.values()) {
			try {
				const categoriaPai = categoriasMap.get(canal.parentId)?.id;
				const novoCanalTexto = await servidorDestino.channels.create(canal.name, {
					type: 'GUILD_TEXT',
					parent: categoriaPai,
					topic: canal.topic || undefined,
					nsfw: canal.nsfw,
					rateLimitPerUser: canal.rateLimitPerUser,
					permissionOverwrites: clonarPermissoes(canal, cargosMap)
				});
				canaisTextoCriados++;

				await sleep(0.5);
			} catch (error) {
				errosEncontrados++;
				await sleep(1);
			}
		}

		exibirProgresso(cliente, corPrincipal, '10/12', 'Criando canais de voz...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Criando canais voz...',
			imagemPequenaTexto: 'Etapa 10/12'
		});
		const canaisVoz = servidorOriginal.channels.cache
			.filter((c) => c.type === 'GUILD_VOICE')
			.sort((a, b) => a.position - b.position);

		let canaisVozCriados = 0;
		for (const canal of canaisVoz.values()) {
			try {
				const categoriaPai = categoriasMap.get(canal.parentId)?.id;
				const novoCanalVoz = await servidorDestino.channels.create(canal.name, {
					type: 'GUILD_VOICE',
					parent: categoriaPai,
					bitrate: canal.bitrate,
					userLimit: canal.userLimit,
					permissionOverwrites: clonarPermissoes(canal, cargosMap)
				});
				canaisVozCriados++;

				await sleep(0.5);
			} catch (error) {
				errosEncontrados++;
				await sleep(1);
			}
		}
		exibirProgresso(cliente, corPrincipal, '11/12', 'Clonando stickers...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Clonando stickers...',
			imagemPequenaTexto: 'Etapa 11/12'
		});

		let stickersCriados = 0;
		for (const sticker of stickers) {
			try {
				const response = await fetch(sticker.url);
				const arrayBuffer = await response.arrayBuffer();
				const ext = sticker.url.split('?')[0].split('.').pop();
				const blob = new Blob([arrayBuffer], { type: obterMimeType(ext) });

				const formData = new FormData();
				formData.append('name', sticker.name);
				formData.append('tags', sticker.tags || 'sticker');
				formData.append('description', sticker.description || '');
				formData.append('file', blob, `sticker.${ext}`);

				const res = await fetch(`https://discord.com/api/v9/guilds/${servidorDestino.id}/stickers`, {
					method: 'POST',
					headers: {
						Authorization: cliente.token
					},
					body: formData
				});
				if (!res.ok) {
					errosEncontrados++;
				} else {
					stickersCriados++;
				}

				await sleep(1);
			} catch (error) {
				errosEncontrados++;
				await sleep(1);
			}
		}
		exibirProgresso(cliente, corPrincipal, '12/12', 'Clonando emojis...');
		await atualizarPresenca({
			detalhe: 'Clonando servidor',
			estado: 'Clonando emojis...',
			imagemPequenaTexto: 'Etapa 12/12'
		});

		const emojis = Array.from(servidorOriginal.emojis.cache.values());

		let emojisCriados = 0;
		for (const emoji of emojis) {
			try {
				await servidorDestino.emojis.create({
					attachment: emoji.url,
					name: emoji.name
				});
				emojisCriados++;

				await sleep(0.5);
			} catch (error) {
				errosEncontrados++;
				await sleep(1);
			}
		}

		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          CLONAGEM CONCLUÍDA!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirSucesso('Servidor clonado com sucesso!', corPrincipal);
		UIComponents.exibirLinhaVazia();

		console.log(
			`        ${Simbolos.info} Original: ${UIComponents.textoColorido(servidorOriginal.name, corPrincipal, false)}`
		);
		console.log(
			`        ${Simbolos.info} Destino: ${UIComponents.textoColorido(servidorDestino.name, corPrincipal, false)}`
		);
		console.log(
			`        ${Simbolos.info} Erros encontrados: ${UIComponents.textoColorido(errosEncontrados.toString(), corPrincipal, false)}`
		);
		UIComponents.exibirLinhaVazia();
		console.log(`        ${Simbolos.info} Pressione ENTER para voltar ao menu`);
		UIComponents.exibirLinhaVazia();

		await atualizarPresenca({
			detalhe: 'Clonagem concluída',
			estado: servidorDestino.name,
			imagemPequenaTexto: '100%'
		});
		readlineSync.question('');
	} catch (error) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem(`Erro durante a clonagem: ${error.message}`, corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.LONG_PAUSE * 1.5);
	}
}

module.exports = {
	clonarServidor
};
