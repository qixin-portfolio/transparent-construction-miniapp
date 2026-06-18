const STAGES = [
  { code: 'start_briefing', name: '开工交底', progress: 10 },
  { code: 'demolition', name: '拆改', progress: 20 },
  { code: 'water_electric_position', name: '水电定位', progress: 30 },
  { code: 'water_electric_acceptance', name: '水电验收', progress: 40 },
  { code: 'waterproof', name: '防水/闭水', progress: 50 },
  { code: 'tile_work', name: '瓦工', progress: 60 },
  { code: 'carpentry_ceiling', name: '木工/吊顶', progress: 70 },
  { code: 'painting', name: '油工/刮墙', progress: 80 },
  { code: 'custom_install', name: '定制安装', progress: 90 },
  { code: 'final_acceptance', name: '竣工验收', progress: 100 }
]

const ROLES = {
  ADMIN: 'admin',
  BOSS_QI: 'boss_qi',
  BOSS_HU: 'boss_hu',
  DESIGNER: 'designer',
  WORKER: 'worker',
  OWNER: 'owner'
}

const INTERNAL_ROLES = [
  ROLES.ADMIN,
  ROLES.BOSS_QI,
  ROLES.BOSS_HU,
  ROLES.DESIGNER,
  ROLES.WORKER
]

const REVIEW_ROLES = [
  ROLES.ADMIN,
  ROLES.BOSS_QI,
  ROLES.BOSS_HU
]

module.exports = {
  STAGES,
  ROLES,
  INTERNAL_ROLES,
  REVIEW_ROLES
}
