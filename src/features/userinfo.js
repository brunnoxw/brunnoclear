const { Simbolos, Cores } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const { solicitarTexto } = require('../ui/menu');
const { exibirTitulo } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Exibe informações detalhadas de um usuário
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function exibirUserInfo(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.USER_INFO);

	atualizarPresenca({
		detalhe: 'Visualizando user info'
	});

	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          INFORMAÇÕES DE USUÁRIO', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Digite o ID do usuário para ver suas informações', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const idUsuario = solicitarTexto('ID do usuário:');

	if (!idUsuario) {
		UIComponents.exibirErroMensagem('ID do usuário não pode estar vazio!', corPrincipal);
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          BUSCANDO INFORMAÇÕES', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Buscando informações do usuário...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	try {
		const usuario = await cliente.users.fetch(idUsuario);

		if (!usuario) {
			UIComponents.exibirErroMensagem('Usuário não encontrado!', corPrincipal);
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}

		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          INFORMAÇÕES DO USUÁRIO', corPrincipal);
		UIComponents.exibirLinhaVazia();

		console.log(`        ${Simbolos.info} Username: ${usuario.username}`);
		if (usuario.globalName) {
			console.log(`        ${Simbolos.info} Nome Global: ${usuario.globalName}`);
		}
		console.log(`        ${Simbolos.info} Discriminador: ${usuario.discriminator}`);
		console.log(`        ${Simbolos.info} ID: ${usuario.id}`);
		console.log(`        ${Simbolos.info} Tag: ${usuario.tag}`);
		console.log(`        ${Simbolos.info} Bot: ${usuario.bot ? 'Sim' : 'Não'}`);
		console.log(`        ${Simbolos.info} Sistema: ${usuario.system ? 'Sim' : 'Não'}`);
		console.log(`        ${Simbolos.info} Criado em: ${usuario.createdAt.toLocaleString('pt-BR')}`);

		if (usuario.avatar) {
			console.log(`        ${Simbolos.info} Avatar URL: ${usuario.displayAvatarURL({ dynamic: true, size: 2048 })}`);
		}

		if (usuario.banner) {
			console.log(`        ${Simbolos.info} Banner URL: ${usuario.bannerURL({ dynamic: true, size: 2048 })}`);
		}

		if (usuario.accentColor) {
			console.log(`        ${Simbolos.info} Cor de destaque: #${usuario.accentColor.toString(16).padStart(6, '0')}`);
		}

		const relacionamento = cliente.relationships?.cache?.get(idUsuario);
		if (relacionamento) {
			const tipos = {
				1: 'Amigo',
				2: 'Bloqueado',
				3: 'Solicitação enviada',
				4: 'Solicitação recebida'
			};
			console.log(`        ${Simbolos.info} Relacionamento: ${tipos[relacionamento] || 'Desconhecido'}`);
		}

		const servidoresComuns = cliente.guilds.cache.filter((guild) => guild.members.cache.has(idUsuario));

		if (servidoresComuns.size > 0) {
			console.log(`        ${Simbolos.info} Servidores em comum: ${servidoresComuns.size}`);
			servidoresComuns.forEach((guild) => {
				console.log(`           ${Simbolos.sucesso} ${guild.name}`);
			});
		}

		UIComponents.exibirLinhaVazia();

		await sleep(10);
	} catch (erro) {
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem(`Erro ao buscar usuário: ${erro.message}`, corPrincipal);
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
	}
}

module.exports = { exibirUserInfo };
