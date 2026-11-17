# Assistente de alimentação — decisões do produto

Priorizar a análise das refeições que o usuário pretende consumir ou já consumiu. Entradas iniciais: descrição e foto de alimento, prato ou rótulo. O usuário revisa alimentos, preparo, porções e nutrientes antes de registrar. A IA informa e sugere; a decisão final é do usuário, sem bloquear uma escolha alimentar ou transformar exercício em punição.

Ser sincero: identificar números informados, estimados e ausentes. Não inventar nutrientes, porções, fontes consultadas, refeições não registradas ou precisão de uma foto. Perguntar quando não houver informação suficiente. Valores estimados continuam editáveis e identificados no diário.

O resumo por data apresenta refeições, calorias e macros registrados, comparação com metas e atividade realizada. Acima da meta alimentar não significa necessariamente superávit. Só apresentar saldo energético do dia quando o usuário confirmar os registros completos, houver calorias para todas as refeições e uma estimativa de gasto total diário. O gasto total já inclui atividades; não somar treino novamente. Nunca converter saldo diário em gramas de gordura perdidos ou ganhos. A pesagem é uma medida informada, não uma medição da mudança de gordura.

Nesta primeira entrega o gasto total diário é informado pelo usuário como estimativa; não será inventado pelo modelo. A geração automática de gasto exige método validado, dados suficientes e premissas visíveis. Registrar ou remover uma refeição reabre a confirmação de alimentação completa daquele dia.

Usar a API hospedada e a conta do usuário. Enviar apenas o contexto necessário, com consentimento antes do envio. Fotos ficam temporariamente na tela, sem armazenamento permanente nesta entrega. Chaves apenas no servidor. Testes com respostas simuladas não comprovam funcionamento de um modelo real.

## Áudio opcional, previsto para depois

O usuário poderá relatar refeições, atividades, pesagens e correções por áudio. A transcrição alimentará o mesmo fluxo de interpretação em propostas estruturadas: registro novo, correção ou informação insuficiente. Exibir o que foi entendido e perguntar sobre ambiguidades, datas e porções. Antes de alterar dados existentes, apresentar os registros afetados; aplicar de forma transacional e idempotente após confirmação. Reenvios não podem duplicar refeições ou exercícios. Não solicitar microfone nem exibir gravação como disponível nesta primeira entrega.

## Entregas futuras

Histórico e tendências de medidas; revisão semanal; alimentos e receitas frequentes; base nutricional com origem e licença verificadas; pesquisa em fontes selecionadas; transcrição e propostas envolvendo várias áreas do diário. Ajustes automáticos autorizados devem ser reversíveis e auditáveis.
