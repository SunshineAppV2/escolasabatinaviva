# Planejamento: Sistema Digital Unidade Viva (Escola Sabatina)

Este planejamento reflete a digitalização completa do **Cartão de Registro da Escola Sabatina**, estruturado para facilitar a coleta de dados e a geração de rankings motivacionais.

## 1. Estrutura Organizacional e Níveis de Acesso
O sistema utiliza os filtros de hierarquia para garantir a privacidade e o foco de cada líder:

*   **Membro:** Vê apenas sua inscrição e progresso individual (`userId`).
*   **Coordenador/Secretário de Unidade:** Gere dados de sua unidade específica (`unidadeId`).
*   **Diretor/Secretário de Escola Sabatina (Igreja Local):** Visão consolidada de todas as unidades da igreja (`churchId`).
*   **Pastor Distrital:** Filtra dados por distrito (`districtId`).
*   **Coordenadores (Regional/Associação):** Filtram por suas respectivas regiões (`regionId`, `associationId`).

## 2. Formulário Digital: Replicação do Cartão de Registro

### A. Cabeçalho e Identificação da Unidade
*   **Trimestre:** 1º, 2º, 3º, 4º.
*   **Unidade de Ação:** Nome da unidade ou Pequeno Grupo.
*   **Professor(a) e Associado(a):** Responsáveis pela classe.
*   **Tipo de Unidade:** Adultos, ES Filial, Classe Bíblica, Jovens.

### B. Gestão de Alunos (Database: `students`)
Para cada aluno, o sistema registrará:
1.  **Nome Completo**
2.  **Telefone de Contato**
3.  **Data de Nascimento** (Geração automática de alertas de aniversário).
4.  **Data de Batismo** (Para acompanhamento do pastoreio).
5.  **Presença Semanal:** Check-box para os 14 sábados do trimestre.

### C. Indicadores Semanais (O "CRM" do Cartão)
Os 5 indicadores cruciais coletados em cada sábado:
1.  **Número de Alunos Presentes:** (P)
2.  **Estudo Diário da Bíblia e Lição:** (E)
3.  **Participação em Pequeno Grupo na semana:** (R)
4.  **Estudos Bíblicos ministrados:** (M1)
5.  **Outra Atividade Missionária:** (M2) - (Contatos, distribuição de materiais, ações solidárias).

### D. Financeiro: Oferta Missionária
*   **Alvo Semanal:** Valor definido como meta da unidade.
*   **Oferta do Sábado:** Registro de quanto foi entregue em cada um dos 14 sábados.
*   **Alvo do 13º Sábado:** Meta específica para o encerramento do trimestre.

## 3. Metas de Unidade (Trimestral)
O sistema permite definir e acompanhar metas em duas fases:

| Categoria | Meta Inicial (Planejado) | Metas Alcançadas (Realizado) |
| :--- | :--- | :--- |
| **Comunhão** | Assinaturas da Lição | Nº Membros estudando diariamente |
| **Relacionamento** | Membros em PGs / Unidades de Ação | Integração Real Unidade + PG (Sim/Não) |
| **Missão** | Duplas Missionárias / Estudos Bíblicos | Pessoas Batizadas no trimestre |

## 4. Lógica de Pontuação e Ranking
Os pontos serão calculados com base nos indicadores semanais:

*   **Presença:** 10 pontos/aluno.
*   **Estudo da Lição:** 25 pontos/aluno.
*   **Participação em PG:** 20 pontos/aluno.
*   **Estudo Bíblico dado:** 50 pontos/aluno.
*   **Batismo:** 500 pontos/unidade.
*   **Meta Financeira Batida:** 100 pontos bônus/sábado.

## 5. Interface Sugerida (Componentes)
1.  **Dashboard de Liderança:** Gráficos de barras comparando "Alvo vs Realizado".
2.  **Chamada Digital:** Tabela interativa para marcar presença e indicadores CRM com um toque.
3.  **Extrato Financeiro:** Visualização do progresso das ofertas rumo ao 13º Sábado.

## 6. Próximos Passos
1.  **Protótipo da Tabela de Alunos:** Criar a interface de gestão de membros.
2.  **Configuração de Banco de Dados:** Criar coleção `reports_weekly` para histórico de 14 sábados.
3.  **Lógica de Exportação:** Opção de gerar o PDF do cartão preenchido para fins de arquivo físico se necessário.
