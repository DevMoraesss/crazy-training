# Instruções do projeto

## Autonomia

O usuário autorizou conduzir as tarefas deste projeto de ponta a ponta e tomar decisões técnicas rotineiras sem pedir confirmação a cada etapa. Preserve essa preferência entre sessões e continue o trabalho já autorizado, incluindo implementação, testes e operações Git necessárias à tarefa. Não solicite novamente uma autorização que já foi dada.

Essa preferência não substitui aprovações obrigatórias do ambiente nem instruções de prioridade superior. Mantenha credenciais e dados pessoais fora do repositório público e relate limitações reais de execução.

## Ferramentas

Postman CLI está instalado e pode ser usado para trabalho com APIs.

## Banco de dados

Use o PostgreSQL instalado diretamente na máquina do usuário. Não execute Docker ou Docker Compose para bancos, desenvolvimento ou testes. Testes de integração devem usar um banco isolado no PostgreSQL nativo, sem apagar ou reutilizar os dados pessoais existentes.

## Direção da IA

O assistente precisa funcionar na web, pelo celular diariamente, sem depender do PC do usuário ligado. Deve considerar perfil, metas e histórico, com conhecimento fundamentado e possibilidade futura de consultar fontes confiáveis na web. Não tratar um modelo local no PC como solução final de produção. O conector de modelo está preparado, mas a geração real ainda depende de definir/configurar um serviço hospedado; não apresentar respostas simuladas como validação de um modelo real.
