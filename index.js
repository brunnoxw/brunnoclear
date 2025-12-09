#!/usr/bin/env node

const { Client } = require('discord.js-selfbot-v13');
const readlineSync = require('readline-sync');
const { obterConfig, criarConfig, adicionarToken } = require('./src/config/configuracao');
const { Cores, Simbolos } = require('./src/utils/cores');
const { sleep } = require('./src/utils/sleep');
const { inicializarRPC, atualizarPresenca } = require('./src/services/rpc');
const { validarToken, buscarTokensWindows } = require('./src/services/tokens');
const { verificarAtualizacaoInicio, menuAtualizacao } = require('./src/services/atualizacao');
const { exibirMenuPrincipal, exibirErro, solicitarTexto, confirmar } = require('./src/ui/menu');
const { exibirTitulo } = require('./src/ui/titulo');
const { limparDMUnica, limparDMsAbertas } = require('./src/features/limpar');
const { removerTodosAmigos } = require('./src/features/amigos');
const { removerTodosServidores } = require('./src/features/servidores');
const { fecharTodasDMs } = require('./src/features/dms');
const { menuConfiguracao } = require('./src/features/configuracao');
const { exibirUserInfo } = require('./src/features/userinfo');
const { abrirDMs } = require('./src/features/abrirdms');
const { menuUtilsCalls } = require('./src/features/calls');
const { apagarPackage } = require('./src/features/package');
const { criarBackupMensagens } = require('./src/features/backup');
const { scraperIcons } = require('./src/features/scraper');
const { clonarServidor } = require('./src/features/clonar');
const { menuZaralho } = require('./src/features/zaralho');
const UIComponents = require('./src/utils/components');
const CONSTANTS = require('./src/config/constants');
const { version: VERSAO_ATUAL } = require('./package.json');
const { backgroundTaskManager } = require('./src/utils/backgroundTasks');

let cliente = null;
let corPrincipal = null;
let estaNoMenuPrincipal = false;
let atualizacaoDisponivel = null;

/**
 * Atualiza o RPC para o estado do menu principal
 */
function entrarMenuPrincipal() {
	estaNoMenuPrincipal = true;
	atualizarPresenca({
		detalhe: 'No menu principal'
	}).catch(() => {});
}

/**
 * Marca que saiu do menu principal
 */
function sairMenuPrincipal() {
	estaNoMenuPrincipal = false;
}

/**
 * Configurar Rich Presence através da interface web
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function configurarRichPresence(cliente, corPrincipal) {
	return new Promise((resolve, reject) => {
		const { spawn } = require('child_process');
		const path = require('path');
		const readline = require('readline');

		sairMenuPrincipal();

		UIComponents.limparTela();
		UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.CONFIGURE_RPC);

		atualizarPresenca({
			detalhe: 'Configurando Rich Presence'
		});

		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirCabecalho('          CONFIGURAR RICH PRESENCE', corPrincipal);

		const serverPath = path.join(__dirname, 'src', 'services', 'rpc-server-standalone.js');

		const child = spawn(process.execPath, [serverPath]);

		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Iniciando servidor de configuração...', corPrincipal);
		UIComponents.exibirInfo('Link para configurar RPC será aberto automaticamente no navegador', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirInfo('Interface web será aberta automaticamente!', corPrincipal);
		UIComponents.exibirSeparador(corPrincipal);

		UIComponents.exibirSucesso('Configure seu Rich Presence na aba do navegador', corPrincipal);
		UIComponents.exibirSucesso('As alterações são salvas automaticamente', corPrincipal);
		UIComponents.exibirInfo('O servidor rodará em processo separado', corPrincipal);
		UIComponents.exibirLinhaVazia();

		UIComponents.exibirSeparador(corPrincipal);

		UIComponents.exibirInstrucaoPressionarEnter(corPrincipal);

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.on('line', () => {
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirInfo('Fechando servidor de configuração...', corPrincipal);
			child.kill();
			rl.close();
			
			atualizarPresenca({
				detalhe: 'No menu principal'
			}).catch(() => {});
			
			resolve('configurado');
		});

		child.on('exit', () => {
			rl.close();
			
			atualizarPresenca({
				detalhe: 'No menu principal'
			}).catch(() => {});
			
			resolve('fechado');
		});

		child.on('error', (erro) => {
			UIComponents.exibirErroMensagem(`Erro ao iniciar servidor: ${erro.message}`, corPrincipal);
			rl.close();
			reject(erro);
		});
	});
}

async function inicializar() {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Inicializando...');

	criarConfig();
	const config = obterConfig();

	corPrincipal = Cores.principal(config.cor_painel);

	await inicializarRPC();

	const { verificarAtualizacao } = require('./src/services/atualizacao');
	const infoAtualizacao = await verificarAtualizacao(true);
	if (infoAtualizacao && infoAtualizacao.disponivel) {
		atualizacaoDisponivel = infoAtualizacao;
	}

	if (!config.tokens || config.tokens.length === 0) {
		await menuSemTokens();
	} else {
		await menuSelecionarToken();
	}
}

async function menuSemTokens() {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Nenhuma token configurada');

	UIComponents.exibirCabecalho(`          BrunnoClear v${VERSAO_ATUAL}`, corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Nenhuma token encontrada na configuração', corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Adicionar token manualmente', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Buscar tokens automaticamente (Windows)', corPrincipal);
	UIComponents.exibirOpcaoMenu('3', 'Sair', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSeparador(corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcao = readlineSync.question(UIComponents.obterPrompt());

	switch (opcao) {
		case '1':
			await adicionarTokenManual();
			await menuSelecionarToken();
			break;
		case '2':
			await buscarTokensAutomatico();
			await menuSelecionarToken();
			break;
		case '3':
			process.exit(0);
			break;
		default:
			await exibirErro('Opção inválida.');
			await menuSemTokens();
	}
}

async function menuAdicionarToken() {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Adicionar token');

	UIComponents.exibirCabecalho('          ADICIONAR TOKEN', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Como deseja adicionar a token?', corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Adicionar manualmente', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Buscar automaticamente (Windows)', corPrincipal);
	UIComponents.exibirOpcaoMenu('3', 'Voltar', corPrincipal);

	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSeparador(corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcao = readlineSync.question(UIComponents.obterPrompt());

	switch (opcao) {
		case '1':
			await adicionarTokenManual();
			break;
		case '2':
			await buscarTokensAutomatico();
			break;
		case '3':
			break;
		default:
			await exibirErro('Opção inválida.');
			await menuAdicionarToken();
	}
}

async function adicionarTokenManual() {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Adicionar token manual');

	UIComponents.exibirCabecalho('          ADICIONAR TOKEN MANUALMENTE', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Insira os dados da token:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	while (true) {
		const token = solicitarTexto('Token:').replace(/"/g, '').trim();
		const nome = solicitarTexto('Nome para representar a token:');

		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Validando token...', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const nomeValido = await validarToken(token);
		if (nomeValido) {
			const resultado = adicionarToken(nome, token);
			if (resultado.sucesso) {
				UIComponents.limparTela();
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirSucesso('Token adicionada com sucesso!', corPrincipal);
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirLinhaVazia();

				await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
				return;
			} else {
				await exibirErro(resultado.mensagem);
			}
		} else {
			await exibirErro('Token inválida, insira outra.');
		}
	}
}

async function buscarTokensAutomatico() {
	if (process.platform !== 'win32') {
		await exibirErro('Esta funcionalidade só está disponível no Windows.');
		return;
	}

	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Busca automática de tokens');

	UIComponents.exibirCabecalho('          BUSCA AUTOMÁTICA DE TOKENS', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Buscando tokens no sistema...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const tokensEncontradas = await buscarTokensWindows();

	if (tokensEncontradas.length === 0) {
		UIComponents.limparTela();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirErroMensagem('Nenhuma token encontrada', corPrincipal);
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(3);
		return;
	}

	const tokensUnicas = [...new Set(tokensEncontradas)];

	const config = obterConfig();
	const tokensExistentes = config.tokens.map((t) => t.token);
	const tokensNovas = tokensUnicas.filter((token) => !tokensExistentes.includes(token));

	if (tokensNovas.length === 0) {
		UIComponents.limparTela();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirInfo('Todas as tokens encontradas já estão cadastradas', corPrincipal);
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(3);
		return;
	}

	UIComponents.limparTela();
	UIComponents.exibirCabecalho('          VALIDANDO TOKENS ENCONTRADAS', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo(`Validando ${tokensNovas.length} token(s)...`, corPrincipal);
	UIComponents.exibirLinhaVazia();

	const tokensComInfo = [];
	const tokensJaCadastradas = [];
	const usuariosVistos = new Set();

	for (let i = 0; i < tokensNovas.length; i++) {
		const token = tokensNovas[i];
		const nomeUsuario = await validarToken(token);

		if (nomeUsuario) {
			const jaExisteNaConfig = config.tokens.some((t) => t.nome === nomeUsuario);

			const jaVistaNaBusca = usuariosVistos.has(nomeUsuario);
			if (jaExisteNaConfig) {
				tokensJaCadastradas.push(nomeUsuario);
				UIComponents.exibirTokenJaCadastrada(i + 1, nomeUsuario, corPrincipal);
			} else if (jaVistaNaBusca) {
				UIComponents.exibirTokenDuplicada(i + 1, nomeUsuario, corPrincipal);
			} else {
				tokensComInfo.push({
					token: token,
					usuario: nomeUsuario
				});
				usuariosVistos.add(nomeUsuario);
				UIComponents.exibirTokenValida(i + 1, nomeUsuario, corPrincipal);
			}
		} else {
			UIComponents.exibirTokenInvalida(i + 1, corPrincipal);
		}
	}
	if (tokensComInfo.length === 0) {
		UIComponents.limparTela();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirInfo('Nenhuma token nova para adicionar', corPrincipal);
		UIComponents.exibirSeparador(corPrincipal);

		if (tokensJaCadastradas.length > 0) {
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirInfo(`Tokens já cadastradas: ${tokensJaCadastradas.join(', ')}`, corPrincipal);
			UIComponents.exibirLinhaVazia();
		}

		await sleep(3);
		return;
	}

	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSeparador(corPrincipal);
	UIComponents.exibirSucesso(`${tokensComInfo.length} token(s) nova(s) disponível(is)`, corPrincipal);
	UIComponents.exibirSeparador(corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Adicionar todas as tokens', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Selecionar individualmente', corPrincipal);
	UIComponents.exibirOpcaoMenu('3', 'Cancelar', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcao = readlineSync.question(UIComponents.obterPrompt());
	switch (opcao) {
		case '1':
			UIComponents.limparTela();
			UIComponents.exibirCabecalho('          ADICIONANDO TOKENS', corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirInfo(`Adicionando ${tokensComInfo.length} token(s)...`, corPrincipal);
			UIComponents.exibirLinhaVazia();

			let adicionadas = 0;
			for (const info of tokensComInfo) {
				const resultado = adicionarToken(info.usuario, info.token);
				if (resultado.sucesso) {
					adicionadas++;
					UIComponents.exibirTokenAdicionada(info.usuario, 'adicionada com sucesso!', corPrincipal);
				} else {
					UIComponents.exibirErroMensagem(`${info.usuario} - ${resultado.mensagem}`, corPrincipal);
				}
			}

			UIComponents.exibirLinhaVazia();
			UIComponents.exibirSeparador(corPrincipal);
			UIComponents.exibirSucesso(`${adicionadas} de ${tokensComInfo.length} token(s) adicionada(s)!`, corPrincipal);
			UIComponents.exibirSeparador(corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(2.5);
			break;
		case '2':
			UIComponents.limparTela();
			UIComponents.exibirCabecalho('          SELECIONAR TOKENS', corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirInfo('Tokens disponíveis:', corPrincipal);
			UIComponents.exibirLinhaVazia();

			for (let i = 0; i < tokensComInfo.length; i++) {
				const info = tokensComInfo[i];
				UIComponents.exibirOpcaoMenu((i + 1).toString(), info.usuario, corPrincipal);
			}

			UIComponents.exibirLinhaVazia();
			UIComponents.exibirInfo('Digite os números separados por espaço', corPrincipal);
			UIComponents.exibirExemploSelecaoTokens(corPrincipal);
			UIComponents.exibirLinhaVazia();

			const selecao = readlineSync.question(UIComponents.obterPrompt()).toLowerCase().trim();
			if (selecao === 'todas' || selecao === 'all') {
				UIComponents.limparTela();
				UIComponents.exibirCabecalho('          ADICIONANDO TOKENS', corPrincipal);
				UIComponents.exibirLinhaVazia();
				UIComponents.exibirInfo('Adicionando todas as tokens...', corPrincipal);
				UIComponents.exibirLinhaVazia();

				let adicionadas = 0;
				for (const info of tokensComInfo) {
					const resultado = adicionarToken(info.usuario, info.token);
					if (resultado.sucesso) {
						adicionadas++;
						UIComponents.exibirTokenAdicionada(info.usuario, 'adicionada!', corPrincipal);
					}
				}

				UIComponents.exibirLinhaVazia();
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirSucesso(`${adicionadas} token(s) adicionada(s)!`, corPrincipal);
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirLinhaVazia();
				await sleep(2.5);
			} else {
				const indices = selecao.split(' ').map((n) => parseInt(n.trim()) - 1);
				UIComponents.limparTela();
				UIComponents.exibirCabecalho('          ADICIONANDO TOKENS SELECIONADAS', corPrincipal);
				UIComponents.exibirLinhaVazia();
				UIComponents.exibirInfo('Adicionando tokens...', corPrincipal);
				UIComponents.exibirLinhaVazia();

				let adicionadas = 0;
				for (const idx of indices) {
					if (idx >= 0 && idx < tokensComInfo.length) {
						const info = tokensComInfo[idx];
						const resultado = adicionarToken(info.usuario, info.token);
						if (resultado.sucesso) {
							adicionadas++;
							UIComponents.exibirTokenAdicionada(info.usuario, 'adicionada!', corPrincipal);
						}
					}
				}

				UIComponents.exibirLinhaVazia();
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirSucesso(`${adicionadas} token(s) adicionada(s)!`, corPrincipal);
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirLinhaVazia();
				await sleep(2.5);
			}
			break;

		case '3':
			UIComponents.limparTela();
			UIComponents.exibirSeparador(corPrincipal);
			UIComponents.exibirInfo('Operação cancelada', corPrincipal);
			UIComponents.exibirSeparador(corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(1.5);
			break;

		default:
			await exibirErro('Opção inválida.');
	}
}

async function menuSelecionarToken() {
	const config = obterConfig();

	if (!config.tokens || config.tokens.length === 0) {
		await menuSemTokens();
		return;
	}

	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Selecionar token');

	UIComponents.exibirCabecalho(`          BrunnoClear v${VERSAO_ATUAL}`, corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Selecione uma token:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	config.tokens.forEach((t, index) => {
		UIComponents.exibirOpcaoMenu((index + 1).toString(), t.nome, corPrincipal);
	});

	UIComponents.exibirLinhaVazia();
	UIComponents.exibirOpcaoMenu((config.tokens.length + 1).toString(), 'Adicionar nova token', corPrincipal);
	UIComponents.exibirOpcaoMenu((config.tokens.length + 2).toString(), 'Sair', corPrincipal);

	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSeparador(corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcao = readlineSync.question(UIComponents.obterPrompt());
	const indice = parseInt(opcao) - 1;

	if (indice >= 0 && indice < config.tokens.length) {
		await conectarComToken(config.tokens[indice].token);
	} else if (parseInt(opcao) === config.tokens.length + 1) {
		await menuAdicionarToken();
		await menuSelecionarToken();
	} else if (parseInt(opcao) === config.tokens.length + 2) {
		process.exit(0);
	} else {
		await exibirErro('Opção inválida.');
		await menuSelecionarToken();
	}
}

async function conectarComToken(token) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Conectando...');

	UIComponents.exibirCabecalho('          CONECTANDO AO DISCORD', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Autenticando com o Discord...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	cliente = new Client({ checkUpdate: false });

	cliente.on('debug', (info) => {});

	cliente.on('error', (erro) => {
		console.error(`${Simbolos.erro} Erro no cliente Discord:`, erro.message);
	});

	try {
		await cliente.login(token);
		UIComponents.limparTela();

		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirLinhaVazia();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirConectadoComo(cliente.user.username, corPrincipal);
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirLinhaVazia();

	await sleep(2);
	
	await atualizarPresenca({
		detalhe: 'No menu principal'
	}).catch((e) => {
		console.log('Erro ao atualizar RPC:', e.message);
	});

	await menuPrincipal();
	} catch (erro) {
		UIComponents.limparTela();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirErroMensagem('ERRO AO CONECTAR', corPrincipal);
		UIComponents.exibirSeparador(corPrincipal);

		UIComponents.exibirLinhaVazia();

		if (erro.message && erro.message.includes('friend_source_flags')) {
			UIComponents.exibirAviso('Erro de configurações do Discord detectado', corPrincipal);
			UIComponents.exibirInfo('Esta conta tem configurações de privacidade incompletas', corPrincipal);
			UIComponents.exibirInfo('Isso é comum em contas mais antigas ou migradas', corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirInfo('A correção foi aplicada automaticamente', corPrincipal);
			UIComponents.exibirInfo('Tente conectar novamente', corPrincipal);
		} else if (erro.message && erro.message.includes('Cannot read properties of null')) {
			UIComponents.exibirAviso('Erro de dados null detectado', corPrincipal);
			UIComponents.exibirInfo('Esta conta tem dados de configuração null no Discord', corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirInfo('Correção aplicada', corPrincipal);
			UIComponents.exibirInfo('Aguarde alguns segundos e tente novamente', corPrincipal);
		} else {
			UIComponents.exibirErroMensagem('Erro ao conectar. Verifique se a token é válida', corPrincipal);
			UIComponents.exibirInfo(`Detalhes: ${erro.message}`, corPrincipal);
		}

		UIComponents.exibirLinhaVazia();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirLinhaVazia();

		await sleep(3);
		await menuSelecionarToken();
	}
}

/**
 * Menu para gerenciar tarefas em segundo plano
 */
async function menuGerenciarTarefas() {
	const tarefas = backgroundTaskManager.getTasks();
	
	if (tarefas.length === 0) {
		UIComponents.limparTela();
		UIComponents.exibirInfo('Nenhuma tarefa em segundo plano ativa', corPrincipal);
		await sleep(2);
		return;
	}

	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Tarefas em Segundo Plano');
	
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	
	UIComponents.exibirCabecalho('          TAREFAS EM SEGUNDO PLANO', corPrincipal);
	UIComponents.exibirLinhaVazia();
	
	tarefas.forEach((task, index) => {
		const tempoDecorrido = Math.floor((Date.now() - task.startedAt) / 1000);
		const minutos = Math.floor(tempoDecorrido / 60);
		const segundos = tempoDecorrido % 60;
		const tempoFormatado = `${minutos}m ${segundos}s`;
		
		console.log(`        ${Simbolos.info} [${task.id}] ${task.name}`);
		console.log(`           Tempo ativo: ${tempoFormatado}`);
		if (task.data) {
			if (task.data.canal) console.log(`           Canal: ${task.data.canal}`);
			if (task.data.guild) console.log(`           Servidor: ${task.data.guild}`);
			if (task.data.usuarios) console.log(`           Usuários: ${task.data.usuarios.length}`);
		}
		UIComponents.exibirLinhaVazia();
	});
	
	UIComponents.exibirSeparador(corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirOpcaoMenu('1', 'Cancelar uma tarefa específica', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Cancelar todas as tarefas', corPrincipal);
	UIComponents.exibirOpcaoMenu('0', 'Voltar', corPrincipal);
	UIComponents.exibirLinhaVazia();
	
	const opcao = readlineSync.question(UIComponents.obterPrompt());
	
	if (opcao === '1') {
		UIComponents.exibirLinhaVazia();
		console.log('        Digite o ID da tarefa para cancelar:');
		const taskId = parseInt(readlineSync.question(UIComponents.obterPrompt()));
		
		const task = backgroundTaskManager.getTask(taskId);
		if (task) {
			await backgroundTaskManager.removeTask(taskId);
			UIComponents.limparTela();
			UIComponents.exibirSucesso(`Tarefa "${task.name}" cancelada!`, corPrincipal);
			await sleep(2);
		} else {
			await exibirErro('ID de tarefa inválido.');
		}
	} else if (opcao === '2') {
		UIComponents.limparTela();
		UIComponents.exibirAviso('Tem certeza que deseja cancelar todas as tarefas?', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirOpcaoMenu('1', 'Sim', corPrincipal);
		UIComponents.exibirOpcaoMenu('2', 'Não', corPrincipal);
		UIComponents.exibirLinhaVazia();
		
		const confirma = readlineSync.question(UIComponents.obterPrompt());
		if (confirma === '1') {
			await backgroundTaskManager.removeAllTasks();
			UIComponents.limparTela();
			UIComponents.exibirSucesso('Todas as tarefas foram canceladas!', corPrincipal);
			await sleep(2);
		}
	}
}

async function menuPrincipal() {

	const acoesMenu = [
		{ id: '1', action: () => limparDMUnica(cliente, corPrincipal) },
		{
			id: '2',
			action: async () => {
				const fechar = confirmar('Fechar cada DM após apagar as mensagens?');
				await limparDMsAbertas(cliente, corPrincipal, fechar);
			}
		},
		{
			id: '3',
			action: () => apagarPackage(cliente, corPrincipal)
		},
		{ id: '4', action: () => removerTodosAmigos(cliente, corPrincipal) },
		{ id: '5', action: () => removerTodosServidores(cliente, corPrincipal) },
		{ id: '6', action: () => fecharTodasDMs(cliente, corPrincipal) },
		{
			id: '7',
			action: async () => {
				UIComponents.limparTela();
				UIComponents.exibirInfo('Funcionalidade em desenvolvimento...', corPrincipal);
				await sleep(2);
			}
		},
		{ id: '8', action: () => exibirUserInfo(cliente, corPrincipal) },
		{ id: '9', action: () => abrirDMs(cliente, corPrincipal) },
		{ id: '10', action: () => menuUtilsCalls(cliente, corPrincipal) },
		{
			id: '11',
			action: () => scraperIcons(cliente, corPrincipal)
		},
		{
			id: '12',
			action: () => clonarServidor(cliente, corPrincipal)
		},
		{
			id: '13',
			action: () => criarBackupMensagens(cliente, corPrincipal)
		},
		{ id: '14', action: () => configurarRichPresence(cliente, corPrincipal) },
		{ id: '15', action: () => menuConfiguracao(cliente, corPrincipal) },
		{ id: '16', action: () => menuZaralho(cliente, corPrincipal) },
		{ id: '99', action: () => process.exit(0) },
		{ id: 'bg', action: () => menuGerenciarTarefas() },
		{
			id: '18',
			action: async () => {
				const resultado = await menuAtualizacao();
				if (resultado === false) {
					atualizacaoDisponivel = null;
				}
			}
		},
		{
			id: '!update',
			action: async () => {
				const resultado = await menuAtualizacao();
				if (resultado === false) {
					atualizacaoDisponivel = null;
				}
			}
		}
	];
	
	while (true) {
		entrarMenuPrincipal();

		const opcao = await exibirMenuPrincipal(cliente, corPrincipal, atualizacaoDisponivel);

		sairMenuPrincipal();

		const opcaoNormalizada = opcao.toLowerCase().trim();

		const acaoEncontrada = acoesMenu.find((item) => item.id === opcao || item.id === opcaoNormalizada);

		if (acaoEncontrada) {
			try {
				await acaoEncontrada.action();
			} catch (erro) {
				console.error(`${Simbolos.erro} Erro ao executar ação:`, erro.message);
				await sleep(2);
			}
		} else {
			await exibirErro('Opção inválida, tente novamente.', 1.5);
		}
	}
}

inicializar().catch((erro) => {
	console.error(`${Simbolos.erro} Erro fatal:`, erro);
	process.exit(1);
});
