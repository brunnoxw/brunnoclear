const chalk = require('chalk');
const { backgroundTaskManager } = require('../utils/backgroundTasks');
const { readlineAsync } = require('../utils/readline-async');
const { atualizarPresenca } = require('../services/rpc');
const { exibirProgressoCompleto } = require('../ui/titulo');
const { obterConfig } = require('../config/configuracao');
const { Cores, textoRainbow } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const UIComponents = require('../utils/components');

class ComandosPrefix {
    constructor(client) {
        this.client = client;
        this.prefix = ';';
        this.messageListener = null;
        this.comandosAtivos = {
            cl: false,
            clIntervalo: null,
            clTaskId: null,
            mic: new Map(),
            mute: new Map(),
            muteall: new Map(),
            block: new Map(),
            blockall: new Map(),
            silence: new Map(),
            coleira: new Map(),
            coleiraIntervalos: new Map(),
            coleiraTaskIds: new Map(),
            proteger: new Set(),
            protegerTaskIds: new Map(),
            apelido: new Map(),
            apelidoIntervalos: new Map(),
            apelidoTaskIds: new Map(),
            elevador: new Map(),
            elevadorIntervalos: new Map(),
            elevadorTaskIds: new Map(),
            stalkear: new Map(),
            stalkearIntervalos: new Map(),
            stalkearTaskIds: new Map(),
            farm: null,
            farmTaskId: null
        };
    }

    iniciar() {
      
        this.messageListener = async (message) => {
            if (message.author.id !== this.client.user.id) return;
            if (!message.content.startsWith(this.prefix)) return;

            const args = message.content.slice(this.prefix.length).trim().split(/ +/);
            const comando = args.shift().toLowerCase();

            try {
                await this.executarComando(comando, args, message);
            } catch (erro) {
                console.error(chalk.red(`Erro ao executar comando ${comando}:`), erro);
            }
        };
        
        this.client.on('messageCreate', this.messageListener);
    }

    async executarComando(comando, args, message) {
        switch (comando) {
            case 'cl':
                await this.deletarMensagens(message);
                break;
            
            case 'stop':
                await this.pararDeletarMensagens(message);
                break;
            
            case 'stopall':
            case 'clearall':
                await this.pararTodosComandos(message);
                break;

            case 'mic':
            case 'rmic':
                await this.mutarMic(args[0], message, comando === 'rmic');
                break;

            case 'mute':
            case 'rmute':
                await this.mutarUsuario(args[0], message, false, comando === 'rmute');
                break;

            case 'muteall':
            case 'rmuteall':
                await this.mutarUsuario(args[0], message, true, comando === 'rmuteall');
                break;

            case 'block':
            case 'rblock':
                await this.bloquearUsuario(args[0], message, false, comando === 'rblock');
                break;

            case 'blockall':
            case 'rblockall':
                await this.bloquearUsuario(args[0], message, true, comando === 'rblockall');
                break;

            case 'silence':
            case 'rsilence':
                await this.silenciarCall(args[0], message, comando === 'rsilence');
                break;

            case 'coleira':
            case 'rcoleira':
                await this.moverParaCall(args[0], message, comando === 'rcoleira');
                break;

            case 'proteger':
            case 'rproteger':
                await this.protegerUsuario(args[0], message, comando === 'rproteger');
                break;

            case 'apelido':
            case 'rapelido':
                await this.mudarApelido(args[0], args.slice(1).join(' '), message, comando === 'rapelido');
                break;

            case 'elevador':
            case 'relevador':
                await this.elevadorCalls(args[0], message, comando === 'relevador');
                break;

            case 'stalkear':
            case 'rstalkear':
                await this.stalkearUsuario(args[0], message, comando === 'rstalkear');
                break;

            case 'link':
            case 'rlink':
                await this.enviarLinkCall(message, comando === 'rlink');
                break;
            
            case 'farm':
            case 'rfarm':
                await this.farmarHoras(args[0], message, comando === 'rfarm');
                break;

            default:
                await message.delete().catch(() => {});
        }
    }

    async mostrarAjuda(message) {
        await message.delete().catch(() => {});
        
        console.log(chalk.cyan('\n════════════════════════════════════════════════════════════════════════════════'));
        console.log(chalk.green.bold('                           📋 LISTA DE COMANDOS                                '));
        console.log(chalk.cyan('════════════════════════════════════════════════════════════════════════════════\n'));
        console.log(chalk.yellow('Prefixo: ') + chalk.white(';') + '\n');
        
        console.log(chalk.cyan(';help') + chalk.gray(' - Lista todos comandos'));
        console.log(chalk.cyan(';cl') + chalk.gray(' - Deleta suas mensagens (') + chalk.cyan(';stop') + chalk.gray(' para parar)'));
        console.log(chalk.cyan(';stopall') + chalk.gray(' - Para TODOS os comandos em background'));
        console.log(chalk.cyan(';mic <id>') + chalk.gray(' - Muta só o mic na sua call (') + chalk.cyan(';rmic') + chalk.gray(' para desmutar)'));
        console.log(chalk.cyan(';mute <id>') + chalk.gray(' - Muta o mic/fone do usuário na sua call (') + chalk.cyan(';rmute') + chalk.gray(')'));
        console.log(chalk.cyan(';muteall <id>') + chalk.gray(' - Muta o mic/fone do usuário em qualquer call (') + chalk.cyan(';rmuteall') + chalk.gray(')'));
        console.log(chalk.cyan(';block <id>') + chalk.gray(' - Desconecta o usuário da sua call e deleta mensagens (') + chalk.cyan(';rblock') + chalk.gray(')'));
        console.log(chalk.cyan(';blockall <id>') + chalk.gray(' - Desconecta o usuário de qualquer call e deleta mensagens (') + chalk.cyan(';rblockall') + chalk.gray(')'));
        console.log(chalk.cyan(';silence <call id>') + chalk.gray(' - Muta todos na call, exceto protegidos (') + chalk.cyan(';rsilence') + chalk.gray(')'));
        console.log(chalk.cyan(';coleira <id>') + chalk.gray(' - Move o usuário para a sua call (') + chalk.cyan(';rcoleira') + chalk.gray(' para parar)'));
        console.log(chalk.cyan(';proteger <id>') + chalk.gray(' - Desmuta o usuário protegido (') + chalk.cyan(';rproteger') + chalk.gray(')'));
        console.log(chalk.cyan(';apelido <id> <apelido>') + chalk.gray(' - Muda o apelido do usuário no sv (') + chalk.cyan(';rapelido') + chalk.gray(')'));
        console.log(chalk.cyan(';elevador <id>') + chalk.gray(' - Move usuário entre calls aleatoriamente (') + chalk.cyan(';relevador') + chalk.gray(')'));
        console.log(chalk.cyan(';stalkear <id>') + chalk.gray(' - Envia link da call do usuário no canal (') + chalk.cyan(';rstalkear') + chalk.gray(')'));
        console.log(chalk.cyan(';link') + chalk.gray(' - Envia o link da sua call (') + chalk.cyan(';rlink') + chalk.gray(' para deletar)'));
        console.log(chalk.cyan(';farm <id_call>') + chalk.gray(' - Farma horas em uma call (') + chalk.cyan(';rfarm') + chalk.gray(' para parar)'));
        
        console.log(chalk.cyan('\n════════════════════════════════════════════════════════════════════════════════\n'));
    }

    async deletarMensagens(message) {
        this.comandosAtivos.cl = true;
        const canal = message.channel;
        const nomeCanal = canal.name || 'DM';
        let contador = 0;
        
        await message.delete().catch(() => {});
        
        let todasMensagens = [];
        let ultimoId = null;
        let deveContinuar = true;
        
        try {
            while (deveContinuar && this.comandosAtivos.cl) {
                const opcoes = { limit: 100 };
                if (ultimoId) {
                    opcoes.before = ultimoId;
                }
                
                const lote = await canal.messages.fetch(opcoes);
                if (lote.size === 0) {
                    deveContinuar = false;
                    break;
                }
                
                const minhasMensagens = lote.filter(m => 
                    m.author.id === this.client.user.id &&
                    m.type === 'DEFAULT' &&
                    !m.system &&
                    m.deletable
                );
                
                todasMensagens = todasMensagens.concat(Array.from(minhasMensagens.values()));
                
                ultimoId = lote.last()?.id;
                
                if (lote.size < 100) {
                    deveContinuar = false;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (erro) {}
        
        const totalFiltradas = todasMensagens.length;
        
        if (totalFiltradas === 0) {
            return;
        }
        
        const pararCL = async () => {
            this.comandosAtivos.cl = false;
            
            await atualizarPresenca({
                detalhe: 'No menu principal'
            }).catch(() => {});
        };
        
        this.comandosAtivos.clTaskId = backgroundTaskManager.addTask(
            `🗑️ Deletando mensagens: ${nomeCanal}`,
            pararCL,
            { canal: nomeCanal, total: totalFiltradas }
        );
        
        
        for (const msg of todasMensagens) {
            if (!this.comandosAtivos.cl) {
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await msg.delete()
                .then(async () => {
                    contador++;

                    await atualizarPresenca({
                        estado: `${Math.round((contador / totalFiltradas) * 100)}%`,
                        detalhe: `Apagando mensagens: ${contador}/${totalFiltradas}`
                    });
                })
                .catch(() => {});
        }
        
        await pararCL();
        
        if (this.comandosAtivos.clTaskId) {
            await backgroundTaskManager.removeTask(this.comandosAtivos.clTaskId);
            this.comandosAtivos.clTaskId = null;
        }
    }

    async pararDeletarMensagens(message) {
        await message.delete().catch(() => {});
        
        this.comandosAtivos.cl = false;
        
        if (this.comandosAtivos.clTaskId) {
            await backgroundTaskManager.removeTask(this.comandosAtivos.clTaskId);
            this.comandosAtivos.clTaskId = null;
        }
        
        await atualizarPresenca({
            detalhe: 'No menu principal'
        }).catch(() => {});
    }

    async pararTodosComandos(message) {
        await message.delete().catch(() => {});
        
        let contador = 0;
        
        if (this.comandosAtivos.clTaskId) {
            await this.pararDeletarMensagens({ delete: () => {} });
            contador++;
        }
        
        for (const [userId, taskId] of this.comandosAtivos.coleiraTaskIds) {
            if (this.comandosAtivos.coleiraIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.coleiraIntervalos.get(userId));
            }
            await backgroundTaskManager.removeTask(taskId);
            contador++;
        }
        this.comandosAtivos.coleira.clear();
        this.comandosAtivos.coleiraIntervalos.clear();
        this.comandosAtivos.coleiraTaskIds.clear();
        
        for (const [userId, taskId] of this.comandosAtivos.apelidoTaskIds) {
            if (this.comandosAtivos.apelidoIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.apelidoIntervalos.get(userId));
            }
            await backgroundTaskManager.removeTask(taskId);
            contador++;
        }
        this.comandosAtivos.apelido.clear();
        this.comandosAtivos.apelidoIntervalos.clear();
        this.comandosAtivos.apelidoTaskIds.clear();
        
        for (const [userId, taskId] of this.comandosAtivos.protegerTaskIds) {
            await backgroundTaskManager.removeTask(taskId);
            contador++;
        }
        this.comandosAtivos.proteger.clear();
        this.comandosAtivos.protegerTaskIds.clear();
        
        for (const [userId, taskId] of this.comandosAtivos.elevadorTaskIds) {
            if (this.comandosAtivos.elevadorIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.elevadorIntervalos.get(userId));
            }
            await backgroundTaskManager.removeTask(taskId);
            contador++;
        }
        this.comandosAtivos.elevador.clear();
        this.comandosAtivos.elevadorIntervalos.clear();
        this.comandosAtivos.elevadorTaskIds.clear();
        
        for (const [userId, intervalo] of this.comandosAtivos.stalkearIntervalos) {
            clearInterval(intervalo);
        }
        this.comandosAtivos.stalkear.clear();
        this.comandosAtivos.stalkearIntervalos.clear();
        
        if (this.comandosAtivos.farmTaskId) {
            if (this.comandosAtivos.farm?.parar) {
                await this.comandosAtivos.farm.parar();
            }
            this.comandosAtivos.farm = null;
            this.comandosAtivos.farmTaskId = null;
            contador++;
        }
        
        await atualizarPresenca({
            detalhe: 'No menu principal'
        }).catch(() => {});
    }

    async mutarMic(userId, message, desmutar) {
        await message.delete().catch(() => {});
        
        if (!message.guild || !message.member?.voice?.channel) {
            return;
        }

        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro || !membro.voice?.channel) return;

        try {
            await membro.voice.setMute(!desmutar);
            await atualizarPresenca({
                detalhe: desmutar ? `Desmutou mic: ${membro.user.tag}` : `Mutou mic: ${membro.user.tag}`,
                estado: 'Comando executado'
            }).catch(() => {});
        } catch (erro) {
            console.error(chalk.red('Erro ao mutar mic:'), erro);
        }
    }

    async mutarUsuario(userId, message, all, desmutar) {
        await message.delete().catch(() => {});
        
        if (!message.guild) {
            return;
        }
        
        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;

        try {
            await membro.voice.setMute(!desmutar);
            await membro.voice.setDeaf(!desmutar);
            await atualizarPresenca({
                detalhe: desmutar ? `Desmutou: ${membro.user.tag}` : `Mutou: ${membro.user.tag}`,
                estado: 'Comando executado'
            }).catch(() => {});
        } catch (erro) {
            console.error(chalk.red('Erro ao mutar usuário:'), erro);
        }
    }

    async bloquearUsuario(userId, message, all, desbloquear) {
        await message.delete().catch(() => {});
        
        if (!message.guild) {
            return;
        }
        
        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;

        try {
            if (!desbloquear) {
                await membro.voice.disconnect();
                
                const mensagens = await message.channel.messages.fetch({ limit: 100 });
                const mensagensUsuario = mensagens.filter(m => m.author.id === userId);
                
                for (const msg of mensagensUsuario.values()) {
                    await msg.delete().catch(() => {});
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                await atualizarPresenca({
                    detalhe: `Bloqueou: ${membro.user.tag}`,
                    estado: 'Comando executado'
                }).catch(() => {});
            }
        } catch (erro) {
            console.error(chalk.red('Erro ao bloquear usuário:'), erro);
        }
    }

    async silenciarCall(callId, message, dessilenciar) {
        await message.delete().catch(() => {});
        
        if (!message.guild || !message.member?.voice?.channel) return;

        const channel = message.member.voice.channel;
        
        try {
            for (const [, membro] of channel.members) {
                if (membro.id === this.client.user.id) continue;
                if (!dessilenciar && this.comandosAtivos.proteger.has(membro.id)) continue;

                await membro.voice.setMute(!dessilenciar);
            }
            
            await atualizarPresenca({
                detalhe: dessilenciar ? 'Dessilenciou call' : 'Silenciou call',
                estado: `${channel.members.size} membros`
            }).catch(() => {});
        } catch (erro) {
            console.error(chalk.red('Erro ao silenciar call:'), erro);
        }
    }

    async moverParaCall(userId, message, parar) {
        await message.delete().catch(() => {});
        
        if (!message.guild || !message.member?.voice?.channel) return;

        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;

        if (parar) {
            this.comandosAtivos.coleira.delete(userId);
            if (this.comandosAtivos.coleiraIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.coleiraIntervalos.get(userId));
                this.comandosAtivos.coleiraIntervalos.delete(userId);
            }
            if (this.comandosAtivos.coleiraTaskIds.has(userId)) {
                await backgroundTaskManager.removeTask(this.comandosAtivos.coleiraTaskIds.get(userId));
                this.comandosAtivos.coleiraTaskIds.delete(userId);
            }
            return;
        }

        this.comandosAtivos.coleira.set(userId, true);
        const myChannel = message.member.voice.channel;
        const nomeUsuario = membro.user.tag;

        const pararColeira = async () => {
            this.comandosAtivos.coleira.delete(userId);
            if (this.comandosAtivos.coleiraIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.coleiraIntervalos.get(userId));
                this.comandosAtivos.coleiraIntervalos.delete(userId);
            }
            this.comandosAtivos.coleiraTaskIds.delete(userId);
            
            await atualizarPresenca({
                detalhe: 'No menu principal'
            }).catch(() => {});
            
        };

        const intervalo = setInterval(async () => {
            if (!this.comandosAtivos.coleira.get(userId)) {
                clearInterval(intervalo);
                if (this.comandosAtivos.coleiraTaskIds.has(userId)) {
                    await backgroundTaskManager.removeTask(this.comandosAtivos.coleiraTaskIds.get(userId));
                    this.comandosAtivos.coleiraTaskIds.delete(userId);
                }
                return;
            }

            try {
                if (membro.voice?.channel?.id !== myChannel.id) {
                    await membro.voice.setChannel(myChannel);
                }
            } catch (erro) {
                console.error(chalk.red('Erro ao mover usuário:'), erro);
            }
        }, 2000);
        
        this.comandosAtivos.coleiraIntervalos.set(userId, intervalo);
        
        const taskId = backgroundTaskManager.addTask(
            `🐕 Coleira: ${nomeUsuario}`,
            pararColeira,
            { usuario: nomeUsuario, userId }
        );
        
        this.comandosAtivos.coleiraTaskIds.set(userId, taskId);
        
        await atualizarPresenca({
            detalhe: `Coleira: ${nomeUsuario}`,
            estado: 'Aguardando movimento'
        }).catch(() => {});
        
    }

    async protegerUsuario(userId, message, desproteger) {
        await message.delete().catch(() => {});
        
        if (!message.guild) {
            return;
        }
        
        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;
        
        const nomeUsuario = membro.user.tag;
        
        if (desproteger) {
            this.comandosAtivos.proteger.delete(userId);
            if (this.comandosAtivos.protegerTaskIds.has(userId)) {
                await backgroundTaskManager.removeTask(this.comandosAtivos.protegerTaskIds.get(userId));
                this.comandosAtivos.protegerTaskIds.delete(userId);
            }
        } else {
            this.comandosAtivos.proteger.add(userId);
            
            const pararProteger = async () => {
                this.comandosAtivos.proteger.delete(userId);
                this.comandosAtivos.protegerTaskIds.delete(userId);
            };
            
            if (membro?.voice) {
                await membro.voice.setMute(false).catch(() => {});
            }
            
            const taskId = backgroundTaskManager.addTask(
                `🛡️ Proteger: ${nomeUsuario}`,
                pararProteger,
                { usuario: nomeUsuario, userId }
            );
            
            this.comandosAtivos.protegerTaskIds.set(userId, taskId);
            
            await atualizarPresenca({
                detalhe: `Protegendo: ${nomeUsuario}`,
                estado: 'Proteção ativa'
            }).catch(() => {});
        }
    }

    async mudarApelido(userId, apelido, message, remover) {
        await message.delete().catch(() => {});
        
        if (!message.guild) {
            return;
        }
        
        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;
        
        const nomeUsuario = membro.user.tag;

        if (remover) {
            if (this.comandosAtivos.apelidoIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.apelidoIntervalos.get(userId));
                this.comandosAtivos.apelidoIntervalos.delete(userId);
            }
            if (this.comandosAtivos.apelidoTaskIds.has(userId)) {
                await backgroundTaskManager.removeTask(this.comandosAtivos.apelidoTaskIds.get(userId));
                this.comandosAtivos.apelidoTaskIds.delete(userId);
            }
            this.comandosAtivos.apelido.delete(userId);
            
            try {
                await membro.setNickname(null);
            } catch (erro) {
                console.error(chalk.red('Erro ao remover apelido:'), erro);
            }
        } else {
            this.comandosAtivos.apelido.set(userId, apelido);
            
            const pararApelido = async () => {
                if (this.comandosAtivos.apelidoIntervalos.has(userId)) {
                    clearInterval(this.comandosAtivos.apelidoIntervalos.get(userId));
                    this.comandosAtivos.apelidoIntervalos.delete(userId);
                }
                this.comandosAtivos.apelido.delete(userId);
                this.comandosAtivos.apelidoTaskIds.delete(userId);
            };
            
            try {
                await membro.setNickname(apelido);
            } catch (erro) {
                console.error(chalk.red('Erro ao mudar apelido:'), erro);
            }
            
            const intervalo = setInterval(async () => {
                if (!this.comandosAtivos.apelido.has(userId)) {
                    clearInterval(intervalo);
                    if (this.comandosAtivos.apelidoTaskIds.has(userId)) {
                        await backgroundTaskManager.removeTask(this.comandosAtivos.apelidoTaskIds.get(userId));
                        this.comandosAtivos.apelidoTaskIds.delete(userId);
                    }
                    return;
                }
                
                try {
                    const apelidoAtual = this.comandosAtivos.apelido.get(userId);
                    if (membro.nickname !== apelidoAtual) {
                        await membro.setNickname(apelidoAtual);
                    }
                } catch (erro) {
                    console.error(chalk.red('Erro ao manter apelido:'), erro);
                }
            }, 5000);
            
            this.comandosAtivos.apelidoIntervalos.set(userId, intervalo);
            
            const taskId = backgroundTaskManager.addTask(
                `✏️ Apelido "${apelido}": ${nomeUsuario}`,
                pararApelido,
                { usuario: nomeUsuario, userId, apelido }
            );
            
            this.comandosAtivos.apelidoTaskIds.set(userId, taskId);
            
            await atualizarPresenca({
                detalhe: `Apelido: ${nomeUsuario}`,
                estado: `"${apelido}"`
            }).catch(() => {});
        }
    }

    async elevadorCalls(userId, message, parar) {
        await message.delete().catch(() => {});
        
        if (!message.guild) {
            return;
        }
        
        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;

        if (parar) {
            this.comandosAtivos.elevador.delete(userId);
            if (this.comandosAtivos.elevadorIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.elevadorIntervalos.get(userId));
                this.comandosAtivos.elevadorIntervalos.delete(userId);
            }
            if (this.comandosAtivos.elevadorTaskIds.has(userId)) {
                await backgroundTaskManager.removeTask(this.comandosAtivos.elevadorTaskIds.get(userId));
                this.comandosAtivos.elevadorTaskIds.delete(userId);
            }
            return;
        }

        this.comandosAtivos.elevador.set(userId, true);
        const voiceChannels = message.guild.channels.cache.filter(c => c.type === "VOICE");
        const nomeUsuario = membro.user.tag;

        const pararElevador = async () => {
            this.comandosAtivos.elevador.delete(userId);
            if (this.comandosAtivos.elevadorIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.elevadorIntervalos.get(userId));
                this.comandosAtivos.elevadorIntervalos.delete(userId);
            }
            this.comandosAtivos.elevadorTaskIds.delete(userId);
            
            await atualizarPresenca({
                detalhe: 'No menu principal'
            }).catch(() => {});
            
        };

        const intervalo = setInterval(async () => {
            if (!this.comandosAtivos.elevador.get(userId)) {
                clearInterval(intervalo);
                if (this.comandosAtivos.elevadorTaskIds.has(userId)) {
                    await backgroundTaskManager.removeTask(this.comandosAtivos.elevadorTaskIds.get(userId));
                    this.comandosAtivos.elevadorTaskIds.delete(userId);
                }
                return;
            }

            try {
                const canais = Array.from(voiceChannels.values());
                const canalAleatorio = canais[Math.floor(Math.random() * canais.length)];
                await membro.voice.setChannel(canalAleatorio);
            } catch (erro) {
                console.error(chalk.red('Erro no elevador:'), erro);
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
        }, 3000);
        
        this.comandosAtivos.elevadorIntervalos.set(userId, intervalo);
        
        const taskId = backgroundTaskManager.addTask(
            `🛗 Elevador: ${nomeUsuario}`,
            pararElevador,
            { usuario: nomeUsuario, userId }
        );
        
        this.comandosAtivos.elevadorTaskIds.set(userId, taskId);
        
        await atualizarPresenca({
            detalhe: `Elevador: ${nomeUsuario}`,
            estado: 'Movendo entre calls'
        }).catch(() => {});
        
    }

    async stalkearUsuario(userId, message, parar) {
        await message.delete().catch(() => {});
        
        if (!message.guild) {
            return;
        }
        
        const membro = await message.guild.members.fetch(userId).catch(() => null);
        if (!membro) return;

        const nomeUsuario = membro.user.tag;

        if (parar) {
            this.comandosAtivos.stalkear.delete(userId);
            if (this.comandosAtivos.stalkearIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.stalkearIntervalos.get(userId));
                this.comandosAtivos.stalkearIntervalos.delete(userId);
            }
            if (this.comandosAtivos.stalkearTaskIds.has(userId)) {
                await backgroundTaskManager.removeTask(this.comandosAtivos.stalkearTaskIds.get(userId));
                this.comandosAtivos.stalkearTaskIds.delete(userId);
            }
            return;
        }

        this.comandosAtivos.stalkear.set(userId, true);
        const canal = message.channel;

        const pararStalkear = async () => {
            this.comandosAtivos.stalkear.delete(userId);
            if (this.comandosAtivos.stalkearIntervalos.has(userId)) {
                clearInterval(this.comandosAtivos.stalkearIntervalos.get(userId));
                this.comandosAtivos.stalkearIntervalos.delete(userId);
            }
            this.comandosAtivos.stalkearTaskIds.delete(userId);
        };

        const taskId = backgroundTaskManager.addTask(
            `🔍 Stalkeando ${nomeUsuario}`,
            pararStalkear,
            { usuario: nomeUsuario, userId }
        );
        
        this.comandosAtivos.stalkearTaskIds.set(userId, taskId);

        const intervalo = setInterval(async () => {
            if (!this.comandosAtivos.stalkear.get(userId)) {
                clearInterval(intervalo);
                return;
            }

            try {
                if (membro.voice?.channel) {
                    const link = `https://discord.com/channels/${message.guild.id}/${membro.voice.channel.id}`;
                    await canal.send(`${membro.user.tag} está em: ${link}`);
                }
            } catch (erro) {
                console.error(chalk.red('Erro ao stalkear:'), erro);
            }
        }, 10000);
        
        this.comandosAtivos.stalkearIntervalos.set(userId, intervalo);
        
        await atualizarPresenca({
            detalhe: `Stalkeando ${nomeUsuario}`,
            estado: 'Monitorando calls'
        }).catch(() => {});
    }

    async enviarLinkCall(message, deletar) {
        if (deletar) {
            await message.delete().catch(() => {});
            return;
        }

        if (!message.guild || !message.member?.voice?.channel) {
            await message.delete().catch(() => {});
            return;
        }

        const link = `https://discord.com/channels/${message.guild.id}/${message.member.voice.channel.id}`;
        await message.channel.send(link);
        await message.delete().catch(() => {});
    }

    async farmarHoras(idCall, message, parar) {
        await message.delete().catch(() => {});
        
        if (parar) {
            if (this.comandosAtivos.farm) {
                await this.comandosAtivos.farm.parar();
                this.comandosAtivos.farm = null;
            }
            if (this.comandosAtivos.farmTaskId) {
                await backgroundTaskManager.removeTask(this.comandosAtivos.farmTaskId);
                this.comandosAtivos.farmTaskId = null;
            }
            return;
        }

        if (!idCall) {
            return;
        }

        const canal = this.client.channels.cache.get(idCall);
        if (!canal || canal.type !== 'GUILD_VOICE') {
            return;
        }

        if (!canal.permissionsFor(canal.guild.members.me).has('CONNECT')) {
            return;
        }

        let connection;
        let iniciou = Date.now();
        let deveContinuar = true;
        let voiceUpdateListener;

        const conectar = async (tentativa = 1, maxTentativas = 3) => {
            try {
                connection = await this.client.voice.joinChannel(canal, {
                    selfMute: false,
                    selfDeaf: false,
                    selfVideo: false
                });
                return true;
            } catch (err) {
                if (tentativa < maxTentativas) {
                    await new Promise(resolve => setTimeout(resolve, tentativa * 2000));
                    return await conectar(tentativa + 1, maxTentativas);
                }
                console.error(chalk.red(`[FARM] Erro ao conectar: ${err.message}`));
                return false;
            }
        };

        const sucesso = await conectar();
        if (!sucesso) {
            return;
        }

        const pararFarmagem = async () => {
            deveContinuar = false;
            if (voiceUpdateListener) {
                this.client.off('voiceStateUpdate', voiceUpdateListener);
            }
            if (connection) {
                await connection.disconnect();
            }
            this.comandosAtivos.farm = null;
            this.comandosAtivos.farmTaskId = null;
            
            await atualizarPresenca({
                detalhe: 'No menu principal'
            }).catch(() => {});
            
        };

        voiceUpdateListener = async (oldState, newState) => {
            if (!deveContinuar) return;
            if (oldState.member.id === this.client.user.id && oldState.channelId && !newState.channelId) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const reconectou = await conectar();
                if (reconectou) {
                    iniciou = Date.now();
                } else {
                    await pararFarmagem();
                }
            }
        };

        this.client.on('voiceStateUpdate', voiceUpdateListener);

        this.comandosAtivos.farm = { parar: pararFarmagem, canal, iniciou };

        const nomeCanal = canal.name || 'Canal Desconhecido';
        const nomeGuild = canal.guild?.name || 'Servidor Desconhecido';

        this.comandosAtivos.farmTaskId = backgroundTaskManager.addTask(
            `⏰ Farmando horas: ${nomeCanal}`,
            pararFarmagem,
            { canal: nomeCanal, guild: nomeGuild, iniciou }
        );

        const iconGuild = canal.guild?.iconURL({ dynamic: true, size: 256 }) || 
            'https://i.pinimg.com/736x/5c/d1/72/5cd172ee967ee3c703c3de27f1f240db.jpg';

        const exibirTelaTempo = () => {
            if (!deveContinuar) return;
            const tempo = Date.now() - iniciou;
            const segundos = Math.floor((tempo / 1000) % 60);
            const minutos = Math.floor((tempo / 1000 / 60) % 60);
            const horas = Math.floor(tempo / 1000 / 60 / 60);

            atualizarPresenca({
                estado: `${horas}h ${minutos}m ${segundos}s`,
                detalhe: `Farmando em: ${nomeCanal}`,
                imagemPequena: iconGuild,
                textoImagemPequena: nomeGuild
            }).catch(() => {});
        };

        exibirTelaTempo();

        const intervaloTempo = setInterval(() => {
            if (!deveContinuar) {
                clearInterval(intervaloTempo);
                return;
            }
            exibirTelaTempo();
        }, 5000);
    }
}

module.exports = ComandosPrefix;
