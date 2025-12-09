const readlineSync = require('readline-sync');
const { Cores, Simbolos, textoRainbow } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const { exibirTitulo } = require('./titulo');
const { backgroundTaskManager } = require('../utils/backgroundTasks');

/**
 * Formata o menu em colunas
 * @param {Array} opcoes - Array de opções com {id, descricao}
 * @param {number} colunas - Número de colunas
 * @param {string} corPrincipal - Cor principal
 * @returns {string} - Menu formatado
 */
function formatarMenuEmColunas(opcoes, colunas, corPrincipal) {
	const tamanhoMaximo = Math.max(...opcoes.map((opt) => opt.descricao.length));
	const linhas = Math.ceil(opcoes.length / colunas);

	const maiorIdLength = Math.max(...opcoes.map((opt) => opt.id.length));

	let saida = '';
	for (let i = 0; i < linhas; i++) {
		let linha = '';
		for (let j = 0; j < colunas; j++) {
			const indice = i + j * linhas;
			if (indice >= opcoes.length) continue;
			const { id, descricao } = opcoes[indice];
			const descPadded = descricao.padEnd(tamanhoMaximo, ' ');

			const idFormatado = `[ ${id} ]`;

			const idColorido =
				corPrincipal === 'rainbow' ? textoRainbow(idFormatado) : `${corPrincipal}${idFormatado}${Cores.reset}`;

			linha += `      ${idColorido} ${descPadded}`;
			if (j < colunas - 1) linha += '     ';
		}
		saida += linha + '\n';
	}

	return saida;
}

/**
 * Exibe separador
 */
function exibirSeparador(cor) {
	const sep = '═══════════════════════════════════════════════════════';
	const texto = cor === 'rainbow' ? textoRainbow(sep) : `${cor}${sep}${Cores.reset}`;
	console.log(`        ${texto}`);
}

/**
 * Exibe cabeçalho
 */
function exibirCabecalho(titulo, corPrincipal) {
	const sep = '═══════════════════════════════════════════════════════';
	const texto = corPrincipal === 'rainbow' ? textoRainbow(sep) : `${corPrincipal}${sep}${Cores.reset}`;
	const tituloTexto = corPrincipal === 'rainbow' ? textoRainbow(titulo) : `${corPrincipal}${titulo}${Cores.reset}`;

	console.log(`\n        ${texto}`);
	console.log(`        ${tituloTexto}`);
	console.log(`        ${texto}\n`);
}

/**
 * Exibe o menu principal
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal do painel
 * @param {Object} atualizacaoDisponivel - Informações sobre atualização disponível
 * @returns {Promise<string>} - Opção selecionada
 */
async function exibirMenuPrincipal(cliente, corPrincipal, atualizacaoDisponivel = null) {
	console.clear();
	process.title = 'BrunnoClear | Menu Principal';
	exibirTitulo(cliente?.user?.username || 'Desconhecido', cliente?.user?.id || '0', corPrincipal);

	console.log(''); // Linha vazia para espaçamento

	// Exibir tarefas em segundo plano
	const tarefasAtivas = backgroundTaskManager.getTasks();
	if (tarefasAtivas.length > 0) {
		const corCiano = Cores.ciano;
		const corAmarelo = Cores.amarelo;
		const reset = Cores.reset;
		const separador = '─'.repeat(55);
		const separadorColorido = corPrincipal === 'rainbow' ? textoRainbow(separador) : `${corPrincipal}${separador}${reset}`;

		console.log(`        ${separadorColorido}`);
		console.log(`        ${corAmarelo}⚡ TAREFAS EM SEGUNDO PLANO ATIVAS:${reset}`);
		tarefasAtivas.forEach((task, index) => {
			console.log(`        ${corCiano}  [${task.id}]${reset} ${task.name}`);
		});
		
		const textoBg = "'bg'";
		const textoBgColorido = corPrincipal === 'rainbow' ? textoRainbow(textoBg) : `${corPrincipal}${textoBg}${reset}`;
		console.log(`        ${Simbolos.dica} Digite ${textoBgColorido} para gerenciar tarefas`);
		console.log(`        ${separadorColorido}\n`);
	}

	if (atualizacaoDisponivel && atualizacaoDisponivel.disponivel) {
		const corVerde = Cores.verde;
		const corVermelho = Cores.vermelho;
		const reset = Cores.reset;

		const separador = '─'.repeat(55);
		const separadorColorido = corPrincipal === 'rainbow' ? textoRainbow(separador) : `${corPrincipal}${separador}${reset}`;
		
		const texto18 = "'18'";
		const textoUpdate = "'!update'";
		const texto18Colorido = corPrincipal === 'rainbow' ? textoRainbow(texto18) : `${corPrincipal}${texto18}${reset}`;
		const textoUpdateColorido = corPrincipal === 'rainbow' ? textoRainbow(textoUpdate) : `${corPrincipal}${textoUpdate}${reset}`;

		console.log(`        ${separadorColorido}`);
		console.log(
			`        ${Simbolos.info} Nova versão disponível: ${corVermelho}v${atualizacaoDisponivel.versaoAtual}${reset} → ${corVerde}v${atualizacaoDisponivel.versaoNova}${reset}`
		);
		console.log(
			`        ${Simbolos.dica} Digite ${texto18Colorido} ou ${textoUpdateColorido} para atualizar`
		);
		console.log(`        ${separadorColorido}\n`);
	}

	const opcoes = [
		{ id: '1', descricao: 'Apagar DM única' },
		{ id: '2', descricao: 'Apagar DMs abertas' },
		{ id: '3', descricao: 'Apagar package' },
		{ id: '4', descricao: 'Remover amigos' },
		{ id: '5', descricao: 'Remover servidores' },
		{ id: '6', descricao: 'Fechar DMs' },
		{ id: '7', descricao: 'Kosame Farm' },
		{ id: '8', descricao: 'Userinfo' },
		{ id: '9', descricao: 'Abrir DMs' },
		{ id: '10', descricao: 'Utilidades de call' },
		{ id: '11', descricao: 'Scraper Icons' },
		{ id: '12', descricao: 'Clonar servidores' },
		{ id: '13', descricao: 'Backup de mensagens' },
		{ id: '14', descricao: 'Definir Rich Presence' },
		{ id: '15', descricao: 'Customizar' },
		{ id: '16', descricao: '😈 Zaralho Mode 😈' },
		{ id: '99', descricao: 'Sair' }
	];

	console.log(formatarMenuEmColunas(opcoes, 2, corPrincipal));
	exibirSeparador(corPrincipal);

	return readlineSync.question('        > ');
}

/**
 * Exibe o menu de configurações
 * @param {Object} cliente - Cliente Discord
 * @param {Object} config - Configuração atual
 * @param {string} corPrincipal - Cor principal
 * @returns {Promise<string>} - Opção selecionada
 */
async function exibirMenuConfig(cliente, config, corPrincipal) {
	console.clear();
	process.title = 'BrunnoClear | Configuração';

	exibirTitulo(cliente?.user?.username || 'Desconhecido', cliente?.user?.id || '0', corPrincipal);

	exibirCabecalho('          CONFIGURAÇÕES', corPrincipal);
	const opcoes = [
		{ id: '1', descricao: 'Mudar delay' },
		{ id: '2', descricao: 'Mudar cor do painel' },
		{
			id: '3',
			descricao: 'Esperar obtenção de todas as mensagens para apagar'
		},
		{ id: '4', descricao: 'Voltar' }
	];

	opcoes.forEach(({ id, descricao }) => {
		const idFormatado = `[ ${id} ]`;
		const idColorido =
			corPrincipal === 'rainbow' ? textoRainbow(idFormatado) : `${corPrincipal}${idFormatado}${Cores.reset}`;
		console.log(`        ${idColorido} ${descricao}`);
	});

	console.log('');
	exibirSeparador(corPrincipal);

	return readlineSync.question('        > ');
}

/**
 * Menu de confirmação simples
 * @param {string} mensagem - Mensagem a exibir
 * @returns {boolean} - true se confirmado
 */
function confirmar(mensagem) {
	console.log(mensagem + ' [s/sim]');
	const resposta = readlineSync.question('> ').toLowerCase();
	return resposta === 's' || resposta === 'sim';
}

/**
 * Solicita entrada de texto
 * @param {string} mensagem - Mensagem a exibir
 * @returns {string} - Texto digitado
 */
function solicitarTexto(mensagem) {
	console.log(mensagem);
	return readlineSync.question('> ').trim();
}

/**
 * Exibe mensagem de erro e aguarda
 * @param {string} mensagem - Mensagem de erro
 * @param {number} segundos - Segundos para aguardar
 */
async function exibirErro(mensagem, segundos = 3.5) {
	console.clear();
	console.log(`${Simbolos.erro} ${mensagem}`);
	await sleep(segundos);
}

/**
 * Exibe mensagem de sucesso e aguarda
 * @param {string} mensagem - Mensagem de sucesso
 * @param {number} segundos - Segundos para aguardar
 */
async function exibirSucesso(mensagem, segundos = 2) {
	console.clear();
	console.log(`${Simbolos.sucesso} ${mensagem}`);
	await sleep(segundos);
}

module.exports = {
	exibirMenuPrincipal,
	exibirMenuConfig,
	confirmar,
	solicitarTexto,
	exibirErro,
	exibirSucesso
};
