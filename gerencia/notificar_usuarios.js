#!/usr/bin/env node
/**
 * Script para notificar usuários sobre nova versão
 * Uso: node notificar_usuarios.js
 */

const { Pool } = require('pg');
const Brevo = require('@getbrevo/brevo');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'estudos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Moc@831028'
});

// Configuração Brevo
const brevoApiKey = process.env.BREVO_API_KEY;
if (!brevoApiKey) {
  console.error('❌ BREVO_API_KEY não configurada!');
  process.exit(1);
}

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);

// Template do email
const getEmailTemplate = (username) => ({
  subject: '📚 Nova Funcionalidade: Importação de Metas do Edital',
  sender: { name: 'Diário de Estudos', email: 'noreply@diariodeestudos.com.br' },
  to: [{ email: username }],
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
        .btn:hover { background: #1d4ed8; }
        .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        h1 { margin: 0; }
        h2 { color: #2563eb; margin-top: 0; }
        .feature-box { background: white; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .icon { font-size: 1.2rem; margin-right: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📚 Diário de Estudos</h1>
        <p>Nova funcionalidade disponível!</p>
      </div>
      <div class="content">
        <h2>Olá! 👋</h2>
        <p>Estamos felizes em anunciar uma <strong>nova funcionalidade</strong> que vai facilitar muito seus estudos!</p>

        <div class="feature-box">
          <p><span class="icon">📚</span><strong>Importação de Metas do Edital</strong></p>
          <p>Chegou de digitar disciplina por disciplina? Agora você pode importar todas as disciplinas do seu edital com apenas alguns cliques!</p>
        </div>

        <h3>🎯 Como funciona:</h3>
        <ol>
          <li>Primeiro, clone um edital do catálogo para sua conta (se ainda não fez isso)</li>
          <li>No <strong>Plano de Estudos</strong>, clique no novo botão <strong>📚 Importar</strong></li>
          <li>Selecione o edital e as disciplinas que deseja estudar</li>
          <li>Clique em <strong>Importar</strong> - pronto! Todas as metas são criadas automaticamente</li>
        </ol>

        <p><strong>💡 Dica:</strong> Se você já tem metas cadastradas manualmente, não se preocupe - o sistema identifica duplicatas e não cria metas repetidas.</p>

        <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #1e407f;"><strong>Economize tempo:</strong> Com essa nova funcionalidade, você pode montar seu plano de estudos em segundos em vez de minutos!</p>
        </div>

        <div style="text-align: center;">
          <a href="https://diariodeestudos.com.br" class="btn">Acessar Agora →</a>
        </div>

        <p style="font-size: 12px; color: #888; margin-top: 20px;">Se você não solicitou esta conta, pode ignorar este email.</p>

        <div class="footer">
          <p>Diário de Estudos &copy; 2026</p>
          <p>Este é um email automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  textContent: `
    Diário de Estudos - Nova Funcionalidade: Importação de Metas do Edital

    Olá!

    Estamos felizes em anunciar uma nova funcionalidade que vai facilitar muito seus estudos!

    Importação de Metas do Edital

    Chegou de digitar disciplina por disciplina? Agora você pode importar todas as disciplinas do seu edital com apenas alguns cliques!

    Como funciona:
    1. Primeiro, clone um edital do catálogo para sua conta (se ainda não fez isso)
    2. No Plano de Estudos, clique no novo botão 📚 Importar
    3. Selecione o edital e as disciplinas que deseja estudar
    4. Clique em Importar - pronto! Todas as metas são criadas automaticamente

    Dica: Se você já tem metas cadastradas manualmente, não se preocupe - o sistema identifica duplicatas e não cria metas repetidas.

    Economize tempo: Com essa nova funcionalidade, você pode montar seu plano de estudos em segundos em vez de minutos!

    Acesse: https://diariodeestudos.com.br

    Se você não solicitou esta conta, pode ignorar este email.

    Diário de Estudos © 2026
  `
});

// Flag para controlar shutdown gracefully
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n\n⚠️  Recebido ${signal}, finalizando graceful shutdown...`);

  try {
    await pool.end();
    console.log('✅ Pool de conexões fechado com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao fechar pool:', error.message);
  }

  process.exit(0);
}

// Handlers de shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Previne que o processo fique travado
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

async function main() {
  try {
    console.log('🔍 Buscando usuários aprovados...');

    const result = await pool.query(`
      SELECT id, username, aprovado
      FROM usuarios
      ORDER BY username
    `);

    const usuarios = result.rows;
    const aprovados = usuarios.filter(u => u.aprovado).length;
    const naoAprovados = usuarios.filter(u => !u.aprovado).length;
    console.log(`📧 Encontrados: ${usuarios.length} usuários (${aprovados} aprovados, ${naoAprovados} não aprovados)`);

    if (usuarios.length === 0) {
      console.log('❌ Nenhum usuário aprovado encontrado.');
      return;
    }

    console.log('\n📋 Usuários a serem notificados:');
    usuarios.forEach(u => console.log(`   - ${u.username} ${u.aprovado ? '✅' : '⏳'}`));
    console.log('');

    // Perguntar confirmação
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`Deseja enviar emails para ${usuarios.length} usuários? (s/n): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 's') {
      console.log('❌ Cancelado.');
      return;
    }

    console.log('\n📨 Enviando emails...\n');

    let success = 0;
    let failed = 0;

    for (const usuario of usuarios) {
      // Verifica se está em shutdown antes de cada envio
      if (isShuttingDown) {
        console.log('\n⚠️  Shutdown iniciado, interrompendo envios...');
        break;
      }

      try {
        const email = getEmailTemplate(usuario.username);
        await apiInstance.sendTransacEmail(email);
        console.log(`✅ ${usuario.username}`);
        success++;
        // Pequeno delay para não sobrecarregar a API
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`❌ ${usuario.username} - ${error.message}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Enviados: ${success}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

main();
