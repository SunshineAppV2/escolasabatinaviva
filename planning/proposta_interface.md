# Proposta de Interface: Unidade Viva Dashboard

A estética do sistema será desenhada para ser moderna, inspiradora e funcional. Abaixo, detalho os componentes principais baseados no mockup gerado.

## 1. Tela de Boas-Vindas & Manifesto
Utilizaremos um **Card de Boas-Vindas dinâmico** que apresenta o propósito da Unidade Viva.

![Dashboard Unidade Viva - Proposta em Português](C:\Users\USUARIO\.gemini\antigravity\brain\5e7228df-6fb6-4f5f-869d-61d799ccefce\unidade_viva_dashboard_portuguese_mockup_1774868162313.png)

### Texto Destaque:
> **"A Unidade Viva é a base da nossa missão. Transformamos a tradicional aula em uma mini-igreja onde o cuidado e o estudo transformam vidas."**

## 2. Chamada Digital (Roll Call)
A interface de chamada foi desenhada para ser rápida e intuitiva em dispositivos móveis, permitindo ao secretário marcar presença e indicadores CRM com apenas um toque.

![Chamada Digital Mockup](C:\Users\USUARIO\.gemini\antigravity\brain\5e7228df-6fb6-4f5f-869d-61d799ccefce\unidade_viva_roll_call_mockup_1774868338798.png)

### Diferenciais:
*   **Check-in Rápido:** Marcar presença de todos e apenas desmarcar os faltosos.
*   **Indicadores em Bloco:** Opção para marcar "Toda a classe estudou a lição" em um único clique.
*   **Feedback Visual:** Cores mudam conforme os indicadores são preenchidos (Verde para completo, Amarelo para parcial).

## 3. Gestão Financeira (Ofertas)
Lógica de acompanhamento de metas semanais e do 13º Sábado com gráficos de progresso.

## 4. Experiência por Nível de Acesso (Filtros)

### Visão do Pastor Distrital (`districtId`)
*   **Mapa de Calor:** Quais igrejas do distrito estão com maior engajamento.
*   **Comparativo de Unidades:** Ranking das melhores unidades do distrito para reconhecimento público.

### Visão do Coordenador de Unidade (`unidadeId`)
*   **Lista de Chamada Gamificada:** Marcar presença e estudo com um clique.
*   **Alertas de Pastoreio:** "O membro X não comparece há 2 semanas. Realizar visita?"

## 5. Tecnologias Recomendadas
*   **Frontend:** React com **Vite** para rapidez e Modern CSS (CSS Variables para os temas).
*   **Backend/Auth:** **Firebase/Firestore** para sincronização em tempo real do ranking.
*   **Gráficos:** Recharts ou Chart.js para as visualizações de dados.

---
**Deseja que comecemos pela estrutura base do código ou refinamos algum critério de pontuação?**
