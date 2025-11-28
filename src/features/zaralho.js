const readlineSync = require('readline-sync');
const { Cores, Simbolos, textoRainbow } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const { exibirTitulo } = require('../ui/titulo');
const { solicitarTexto, exibirErro } = require('../ui/menu');
const { atualizarPresenca } = require('../services/rpc');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Menu principal do Zaralho - Features engraçadas e trollagem
 * @param {Client} client - Cliente do Discord
 * @param {string} corPrincipal - Cor principal do menu
 */
async function menuZaralho(client, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Zaralho Mode 😈');

	exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);
	UIComponents.exibirCabecalho('          🎭 ZARALHO MODE 🎭', corPrincipal);
	UIComponents.exibirLinhaVazia();
	console.log(`        ${UIComponents.textoColorido('⚠️  ATENÇÃO: Use com responsabilidade! ⚠️', Cores.amarelo, false)}`);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirOpcaoMenu('1', '🔒 Nickname Bloqueado (forçar nickname em usuário)', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', '🚫 Blacklist Chat (apagar mensagens instantaneamente)', corPrincipal);
	UIComponents.exibirOpcaoMenu('3', '🚪 Anti DM (sair automaticamente de grupos DM)', corPrincipal);
	UIComponents.exibirOpcaoMenu('0', 'Voltar', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcao = readlineSync.question(UIComponents.obterPrompt());

	const voltarMenu = async () => {
		await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
		return;
	};

	const nicknameBloqueado = async () => {
		UIComponents.limparTela();
		UIComponents.definirTituloJanela('BrunnoClear | Nickname Bloqueado 🔒');

		exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

		UIComponents.exibirCabecalho('          🔒 NICKNAME BLOQUEADO 🔒', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Digite o ID do servidor:', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const idGuild = solicitarTexto('');
		const guild = client.guilds.cache.get(idGuild);

		if (!guild) {
			await exibirErro('Servidor não encontrado.');
			return voltarMenu();
		}

		UIComponents.limparTela();
		exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

		UIComponents.exibirCabecalho('          🔒 NICKNAME BLOQUEADO 🔒', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Digite o ID do usuário a ser bloqueado:', corPrincipal);
		UIComponents.exibirLinhaVazia();
		const idUsuario = solicitarTexto('');
		const membro = await guild.members.fetch(idUsuario).catch(() => null);

		if (!membro) {
			await exibirErro('Usuário não encontrado no servidor.');
			return voltarMenu();
		}

		if (membro.user.bot) {
			await exibirErro('Não é possível bloquear o nickname de bots.');
			return voltarMenu();
		}

		const membroBot = guild.members.me;

		if (!membroBot.permissions.has('ManageNicknames')) {
			await exibirErro('O bot não tem permissão "Gerenciar Apelidos" no servidor.');
			return voltarMenu();
		}

		if (membro.roles.highest.position >= membroBot.roles.highest.position) {
			await exibirErro('O usuário tem cargo superior ou igual ao bot. Não é possível gerenciar seu nickname.');
			return voltarMenu();
		}

		if (membro.id === guild.ownerId) {
			await exibirErro('Não é possível gerenciar o nickname do dono do servidor.');
			return voltarMenu();
		}

		UIComponents.limparTela();
		exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

		UIComponents.exibirCabecalho('          🔒 NICKNAME BLOQUEADO 🔒', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo(`Digite o nickname que deseja forçar para ${membro.user.tag}:`, corPrincipal);
		UIComponents.exibirLinhaVazia();

		const nicknamePersistente = solicitarTexto('');
		if (!nicknamePersistente || nicknamePersistente.trim() === '') {
			await exibirErro('Nickname inválido.');
			return voltarMenu();
		}
		let deveContinuar = true;
		let bloqueios = 0;
		let ultimaAcao = 'Aguardando mudanças...';

		try {
			await membro.setNickname(nicknamePersistente);
			ultimaAcao = `Nickname forçado: ${nicknamePersistente}`;
		} catch (err) {
			await exibirErro(`Erro ao definir nickname: ${err.message}`);
			return voltarMenu();
		}

		const exibirTelaBloqueio = () => {
			if (!deveContinuar) return;

			atualizarPresenca({
				estado: `Bloqueando: ${membro.user.username}`,
				detalhe: `Bloqueios: ${bloqueios}`,
				imagemPequena:
					guild.iconURL({ dynamic: true, size: 256 }) ||
					'https://i.pinimg.com/736x/5c/d1/72/5cd172ee967ee3c703c3de27f1f240db.jpg',
				textoImagemPequena: `${guild.name}`
			});

			UIComponents.limparTela();
			exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

			UIComponents.exibirCabecalho('          🔒 BLOQUEIO ATIVO 🔒', corPrincipal);
			UIComponents.exibirLinhaVazia();

			console.log(
				`        ${Simbolos.sucesso} Servidor: ${UIComponents.textoColorido(guild.name, corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Usuário bloqueado: ${UIComponents.textoColorido(membro.user.tag, corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Nickname forçado: ${UIComponents.textoColorido(nicknamePersistente, corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Bloqueios realizados: ${UIComponents.textoColorido(bloqueios.toString(), corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Última ação: ${UIComponents.textoColorido(ultimaAcao, corPrincipal, false)}`
			);
			UIComponents.exibirLinhaVazia();
			console.log(`        ${UIComponents.textoColorido('🔒 Bloqueando mudanças... 🔒', corPrincipal, false)}`);
			UIComponents.exibirLinhaVazia();
			console.log(`        Pressione ${UIComponents.textoColorido('ENTER', corPrincipal, false)} para parar.`);
			UIComponents.exibirLinhaVazia();
		};

		const guildMemberUpdateListener = async (oldMember, newMember) => {
			if (!deveContinuar) return;
			if (newMember.id !== idUsuario) return;
			if (newMember.guild.id !== guild.id) return;

			if (newMember.nickname !== nicknamePersistente) {
				try {
					await newMember.setNickname(nicknamePersistente);
					bloqueios++;

					const nicknameAnterior = newMember.nickname || oldMember.nickname || '(sem nick)';
					ultimaAcao = `Bloqueado: "${nicknameAnterior}" → "${nicknamePersistente}"`;

					exibirTelaBloqueio();
				} catch (err) {
					ultimaAcao = `❌ Erro ao bloquear: ${err.message}`;
					exibirTelaBloqueio();
				}
			}
		};

		/**
		 * Verificação periódica de nickname (fallback caso o evento não dispare)
		 */
		const verificarNickname = async () => {
			if (!deveContinuar) return;

			try {
				const membroAtual = await guild.members.fetch(idUsuario);

				if (membroAtual.nickname !== nicknamePersistente) {
					await membroAtual.setNickname(nicknamePersistente);
					bloqueios++;

					const nicknameAnterior = membroAtual.nickname || '(sem nick)';
					ultimaAcao = `Restaurado: "${nicknameAnterior}" → "${nicknamePersistente}"`;
					exibirTelaBloqueio();
				}
			} catch (err) {}
		};

		client.on('guildMemberUpdate', guildMemberUpdateListener);
		const intervalVerificar = setInterval(verificarNickname, 2000);

		exibirTelaBloqueio();

		await new Promise((resolve) => {
			const stdin = process.stdin;
			stdin.setRawMode(true);
			stdin.resume();
			stdin.setEncoding('utf8');

			const onData = (key) => {
				if (key === '\r' || key === '\n' || key.charCodeAt(0) === 13) {
					deveContinuar = false;
					client.off('guildMemberUpdate', guildMemberUpdateListener);
					clearInterval(intervalVerificar);
					stdin.setRawMode(false);
					stdin.pause();
					stdin.removeListener('data', onData);
					resolve();
				}
			};

			stdin.on('data', onData);
		});
		atualizarPresenca({
			detalhe: 'No menu principal'
		});

		await voltarMenu();
	};

	const blacklistChat = async () => {
		UIComponents.limparTela();
		UIComponents.definirTituloJanela('BrunnoClear | Blacklist Chat 🚫');

		exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

		UIComponents.exibirCabecalho('          🚫 BLACKLIST CHAT 🚫', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Digite o ID do servidor:', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const idGuild = solicitarTexto('');
		const guild = client.guilds.cache.get(idGuild);

		if (!guild) {
			await exibirErro('Servidor não encontrado.');
			return voltarMenu();
		}

		UIComponents.limparTela();
		exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

		UIComponents.exibirCabecalho('          🚫 BLACKLIST CHAT 🚫', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Digite o ID do usuário a ser bloqueado:', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const idUsuario = solicitarTexto('');
		const membro = await guild.members.fetch(idUsuario).catch(() => null);

		if (!membro) {
			await exibirErro('Usuário não encontrado no servidor.');
			return voltarMenu();
		}

		if (membro.user.bot) {
			await exibirErro('Não é possível bloquear mensagens de bots.');
			return voltarMenu();
		}

		const membroBot = guild.members.me;

		if (!membroBot.permissions.has('ManageMessages')) {
			await exibirErro('O bot não tem permissão "Gerenciar Mensagens" no servidor.');
			return voltarMenu();
		}

		let deveContinuar = true;
		let mensagensApagadas = 0;
		let ultimaAcao = 'Aguardando mensagens...';
		let ultimoCanal = 'Nenhum';

		const exibirTelaBloqueio = () => {
			if (!deveContinuar) return;

			atualizarPresenca({
				estado: `Bloqueando: ${membro.user.username}`,
				detalhe: `Msgs apagadas: ${mensagensApagadas}`,
				imagemPequena:
					guild.iconURL({ dynamic: true, size: 256 }) ||
					'https://i.pinimg.com/736x/5c/d1/72/5cd172ee967ee3c703c3de27f1f240db.jpg',
				textoImagemPequena: `${guild.name}`
			});

			UIComponents.limparTela();
			exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

			UIComponents.exibirCabecalho('          🚫 BLACKLIST ATIVO 🚫', corPrincipal);
			UIComponents.exibirLinhaVazia();

			console.log(
				`        ${Simbolos.sucesso} Servidor: ${UIComponents.textoColorido(guild.name, corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Usuário bloqueado: ${UIComponents.textoColorido(membro.user.tag, corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Mensagens apagadas: ${UIComponents.textoColorido(mensagensApagadas.toString(), corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Último canal: ${UIComponents.textoColorido(ultimoCanal, corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Última ação: ${UIComponents.textoColorido(ultimaAcao, corPrincipal, false)}`
			);
			UIComponents.exibirLinhaVazia();
			console.log(
				`        ${UIComponents.textoColorido('🚫 Apagando mensagens automaticamente... 🚫', corPrincipal, false)}`
			);
			UIComponents.exibirLinhaVazia();
			console.log(`        Pressione ${UIComponents.textoColorido('ENTER', corPrincipal, false)} para parar.`);
			UIComponents.exibirLinhaVazia();
		};

		const messageCreateListener = async (message) => {
			if (!deveContinuar) return;
			if (message.author.id !== idUsuario) return;
			if (message.guild?.id !== guild.id) return;

			try {
				const canal = message.channel;
				const permissoesCanal = canal.permissionsFor(membroBot);

				if (!permissoesCanal || !permissoesCanal.has('ManageMessages')) {
					ultimaAcao = `❌ Sem permissão em #${canal.name}`;
					exibirTelaBloqueio();
					return;
				}

				await message.delete();
				mensagensApagadas++;

				const preview =
					message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content || '(anexo/embed)';

				ultimoCanal = `#${canal.name}`;
				ultimaAcao = `Apagada: "${preview}"`;

				exibirTelaBloqueio();
			} catch (err) {
				ultimaAcao = `❌ Erro ao apagar: ${err.message}`;
				exibirTelaBloqueio();
			}
		};

		client.on('messageCreate', messageCreateListener);

		exibirTelaBloqueio();

		await new Promise((resolve) => {
			const stdin = process.stdin;
			stdin.setRawMode(true);
			stdin.resume();
			stdin.setEncoding('utf8');

			const onData = (key) => {
				if (key === '\r' || key === '\n' || key.charCodeAt(0) === 13) {
					deveContinuar = false;
					client.off('messageCreate', messageCreateListener);
					stdin.setRawMode(false);
					stdin.pause();
					stdin.removeListener('data', onData);
					resolve();
				}
			};

			stdin.on('data', onData);
		});

		atualizarPresenca({
			detalhe: 'No menu principal'
		});
		await voltarMenu();
	};

	const antiDM = async () => {
		UIComponents.limparTela();
		UIComponents.definirTituloJanela('BrunnoClear | Anti DM 🚪');

		exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

		UIComponents.exibirCabecalho('          🚪 ANTI DM 🚪', corPrincipal);
		UIComponents.exibirLinhaVazia();
		console.log(`        ${UIComponents.textoColorido('✨ Proteção contra grupos DM ativada!', corPrincipal, false)}`);
		UIComponents.exibirLinhaVazia();

		let deveContinuar = true;
		let gruposSaidos = 0;
		let ultimaAcao = 'Aguardando convites...';
		let ultimoGrupo = 'Nenhum';

		const exibirTelaAntiDM = () => {
			if (!deveContinuar) return;

			atualizarPresenca({
				estado: 'Anti DM Ativo',
				detalhe: `Grupos evitados: ${gruposSaidos}`,
				imagemPequena: 'https://i.pinimg.com/736x/5c/d1/72/5cd172ee967ee3c703c3de27f1f240db.jpg',
				textoImagemPequena: 'Proteção Ativa'
			});

			UIComponents.limparTela();
			exibirTitulo(client?.user?.username || 'Desconhecido', client?.user?.id || '0', corPrincipal);

			UIComponents.exibirCabecalho('          🚪 ANTI DM ATIVO 🚪', corPrincipal);
			UIComponents.exibirLinhaVazia();

			console.log(`        ${Simbolos.sucesso} Proteção: ${UIComponents.textoColorido('ATIVA', corPrincipal, false)}`);
			console.log(
				`        ${Simbolos.info} Grupos evitados: ${UIComponents.textoColorido(gruposSaidos.toString(), corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Último grupo: ${UIComponents.textoColorido(ultimoGrupo, corPrincipal, false)}`
			);
			console.log(
				`        ${Simbolos.info} Última ação: ${UIComponents.textoColorido(ultimaAcao, corPrincipal, false)}`
			);
			UIComponents.exibirLinhaVazia();
			console.log(
				`        ${UIComponents.textoColorido('🚪 Saindo automaticamente de grupos DM... 🚪', corPrincipal, false)}`
			);
			UIComponents.exibirLinhaVazia();
			console.log(`        Pressione ${UIComponents.textoColorido('ENTER', corPrincipal, false)} para parar.`);
			UIComponents.exibirLinhaVazia();
		};

		const channelCreateListener = async (channel) => {
			if (!deveContinuar) return;

			if (channel.type === 'GROUP_DM') {
				try {
					const nomeGrupo = channel.name || 'Grupo sem nome';
					const participantes = channel.recipients ? channel.recipients.size : 0;

					await channel.delete();

					gruposSaidos++;
					ultimoGrupo = nomeGrupo;
					ultimaAcao = `Saiu de: "${nomeGrupo}" (${participantes} participantes)`;

					exibirTelaAntiDM();
				} catch (err) {
					ultimaAcao = `❌ Erro ao sair: ${err.message}`;
					exibirTelaAntiDM();
				}
			}
		};

		client.on('channelCreate', channelCreateListener);

		exibirTelaAntiDM();

		await new Promise((resolve) => {
			const stdin = process.stdin;
			stdin.setRawMode(true);
			stdin.resume();
			stdin.setEncoding('utf8');

			const onData = (key) => {
				if (key === '\r' || key === '\n' || key.charCodeAt(0) === 13) {
					deveContinuar = false;
					client.off('channelCreate', channelCreateListener);
					stdin.setRawMode(false);
					stdin.pause();
					stdin.removeListener('data', onData);
					resolve();
				}
			};

			stdin.on('data', onData);
		});

		atualizarPresenca({
			detalhe: 'No menu principal'
		});
		await voltarMenu();
	};

	const acoesMenu = [
		{ id: '1', action: () => nicknameBloqueado() },
		{ id: '2', action: () => blacklistChat() },
		{ id: '3', action: () => antiDM() },
		{ id: '0', action: () => voltarMenu() }
	];

	const acaoEncontrada = acoesMenu.find((item) => item.id === opcao);

	if (acaoEncontrada) {
		return await acaoEncontrada.action();
	} else {
		await exibirErro('Opção inválida.');
		return menuZaralho(client, corPrincipal);
	}
}

module.exports = {
	menuZaralho
};
