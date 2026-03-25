-- Migração: tabela de solicitações de alteração (editar/deletar) por COORDENADOR
-- Requer aprovação de ADMIN com janela de tempo configurável

CREATE TABLE IF NOT EXISTS solicitacoes_alteracao (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id        UUID        NOT NULL,
  solicitante_id   UUID        NOT NULL,
  tipo             VARCHAR(20) NOT NULL,
  motivo           TEXT        NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pendente',
  criado_em        TIMESTAMP   NOT NULL DEFAULT NOW(),
  respondido_em    TIMESTAMP,
  admin_id         UUID,
  tempo_liberado_ate TIMESTAMP,

  CONSTRAINT chk_solic_tipo   CHECK (tipo   IN ('editar', 'deletar')),
  CONSTRAINT chk_solic_status CHECK (status IN ('pendente', 'aceita', 'recusada'))
);

-- Índice único parcial: impede múltiplas solicitações pendentes do mesmo tipo
-- para o mesmo (tarefa, solicitante)
CREATE UNIQUE INDEX IF NOT EXISTS ux_solic_pendente
  ON solicitacoes_alteracao (tarefa_id, solicitante_id, tipo)
  WHERE status = 'pendente';
