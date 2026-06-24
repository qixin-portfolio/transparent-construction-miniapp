const brand = {
  name: '晟景透明工地',
  sellingPoints: [
    '交城本地长期经营老店，重视口碑和售后。',
    '报价透明，材料、工艺、增项边界提前说清。',
    '重视环保材料和检测报告，尤其是柜体板材环保等级。',
    '老板和负责人盯工地，关键节点拍照留底。',
    '更适合重视品质、环保、售后和长期居住体验的客户。'
  ],
  compareRules: [
    '不直接说别人不好，先让客户把报价明细拿来逐项对。',
    '重点对比水电、防水、板材环保等级、柜体面积、五金、安装和售后。',
    '提醒客户看清低价里不包含什么，以及后期超出怎么收费。',
    '如果客户只追最低价，要先做客户筛选，不强推整装。'
  ]
}

const communities = [
  {
    name: '天泰',
    aliases: ['天泰', '天泰小区'],
    area: '约105-130㎡',
    layout: '三室两厅为主',
    budget: '约12-15万起，案例中130㎡法式复古约14.7万地面以上',
    customerType: '刚需、自住、婚房客户较多',
    talkingPoint: '适合用天泰02案例讲法式复古、全屋定制和环保售后。'
  },
  {
    name: '万硕',
    aliases: ['万硕', '万硕小区', '万硕花园'],
    area: '约148㎡',
    layout: '三室两厅一卫或改善型户型',
    budget: '约15-25万，万硕01成交约16.5万',
    customerType: '婚房、改善型、重视效果和预算透明的客户',
    talkingPoint: '适合用万硕01案例讲意式简约、莫干山、报价透明和老客户转介绍。'
  },
  {
    name: '公园里',
    aliases: ['公园里'],
    area: '约110-122㎡',
    layout: '三室两厅一厨一卫',
    budget: '约15万左右',
    customerType: '刚需、自住、省钱但希望效果好的客户',
    talkingPoint: '适合讲开工交底、预算控制和施工细节。'
  },
  {
    name: '景宜',
    aliases: ['景宜'],
    area: '约110㎡',
    layout: '三室两厅',
    budget: '约12-15万',
    customerType: '婚房、预算敏感但想装好房的客户',
    talkingPoint: '适合讲低预算也能通过取舍装出好效果。'
  }
]

const cases = [
  {
    key: 'wanshuo01',
    title: '万硕01｜万硕花园148㎡意式简约',
    community: '万硕花园',
    area: '148㎡',
    layout: '三室两厅一卫',
    style: '意式简约 / 莫干山',
    initialBudget: '约15万',
    finalAmount: '约16.5万',
    includes: '基础施工、主材、全屋定制',
    reasons: ['老客户转介绍', '本地口碑', '报价透明', '环保材料', '设计效果能落地'],
    promotion: '适合讲“预算透明 + 效果落地 + 老店售后”的真实成交案例。',
    audience: '万硕、148㎡左右、婚房或改善型、想要意式简约的客户'
  },
  {
    key: 'tiantai02',
    title: '天泰02｜天泰130㎡法式复古',
    community: '天泰',
    area: '130㎡',
    layout: '三室两厅两卫',
    style: '法式复古 / 维意定制',
    initialBudget: '约14万',
    finalAmount: '约14.7万地面以上',
    includes: '基础施工、主材、全屋定制',
    reasons: ['报价透明', '环保材料', '设计效果好', '施工细节好', '售后有保障'],
    promotion: '适合讲“法式复古 + 全屋定制 + 环保售后”的案例。',
    audience: '天泰、130㎡左右、喜欢法式复古、重视柜子和环保的客户'
  },
  {
    key: 'gongyuanli-handoff',
    title: '公园里110㎡交底样本',
    community: '公园里',
    area: '110㎡',
    layout: '三室两厅一厨一卫',
    style: '新房拎包入住',
    initialBudget: '省钱但要效果',
    finalAmount: '未标注',
    includes: '交底样本、客户重点、施工重点',
    reasons: ['客户希望省钱', '希望效果好', '施工细节不能出错'],
    promotion: '适合讲“开工前为什么必须交底”和“预算有限时怎么控风险”。',
    audience: '公园里、刚需自住、省钱但希望效果好的客户'
  }
]

const lostCases = [
  {
    title: '阳渠平房155㎡',
    reason: '价格不接受 + 信任不足',
    lesson: '预算不匹配时不要强推整装，先确认预算边界，必要时转为低价单品或后续养客。'
  },
  {
    title: '月亮湾116㎡',
    reason: '出钱方只看低价，客户想要更高配置',
    lesson: '解释低价套餐时要对比柜体面积、板材等级、五金、售后和是否包含全屋定制。'
  }
]

const quoteRules = {
  mustKeep: ['水电改造', '防水', '墙面基层和刮墙', '定制安装和五金', '环保板材', '高频使用的花洒、龙头、开关'],
  canAdjust: ['复杂背景墙', '局部吊顶', '装饰性灯具', '非必要柜体数量', '软装和后期搭配'],
  waterElectric: [
    '水电不能只问多少钱一米，要看是否包含开槽、封槽、底盒、管件、打压、品牌规格。',
    '低价水电容易把开槽、底盒、管件、打压拆出去单算。',
    '厨房、空调、大功率电器要关注专线和点位上限。'
  ],
  tile: [
    '地砖铺贴约30元/㎡，地砖上墙约60元/㎡，磨斜边约60元/米，包柱约400元/个，房间防水约200元/间。',
    '瓦工报价要区分地面、墙面、斜边、包柱、防水，不能只看一个平米单价。',
    '瓦工验收要看平整度、垂直度、阴阳角、空鼓、收口和插座开孔。'
  ],
  custom: [
    '全屋定制要看板材等级、柜体面积、门板、五金、功能件、安装和售后。',
    '低价套餐要问清楚包含多少柜体、是否包含厨房卫浴木门墙板、超出面积怎么计价。',
    '49999套餐属于柜、厨、卫、墙、门、家具组合，不是单一柜类报价。'
  ],
  oldHouse: [
    '旧房拆开后才能看到管线、基层和结构问题，前期预算只能做风险预估。',
    '拆除、基层、水电老化、结构限制最容易产生不可控增项。',
    '旧房报价必须提前写清哪些包含、哪些按实际发生。'
  ]
}

const inspectionRules = {
  handoff: [
    '设计师和工长交接时，必须复述客户在方案沟通中强调过的注意事项。',
    '口头承诺、赠品、变更、客户特殊要求必须写入交底，不靠记忆。',
    '交底时提醒工长按国家标准施工，关键节点拍照留底。'
  ],
  forbidden: [
    '承重墙、结构柱不可拆改。',
    '天然气不可随意移动。',
    '国家装饰建材标准不允许的项目必须提前向客户说明。'
  ],
  waterproof: [
    '防水没处理好会漏水、返潮；施工不当也可能导致墙砖脱落、地砖渗水。',
    '卫生间闭水试验建议48小时，并确认楼下无渗漏。',
    '厨房、卫生间管口、墙角、阴阳角要重点处理。'
  ],
  tile: [
    '瓦工要横平竖直、阴阳角方正，否则影响后期橱柜、衣柜、石材、木门安装。',
    '墙面找平和垂直度不好，后期柜体和木门容易留大缝。',
    '地砖要检查空鼓、平整度、坡度和地漏排水。'
  ],
  hardware: [
    '灯具、开关、电路相关产品建议选品牌和有质保的产品。',
    '基础装修、隐蔽工程、环保材料、高频五金不能盲目省钱。',
    '房子通常要住15到20年以上，每天用的东西不能只看低价。'
  ]
}

const salesScripts = {
  opening: '您这套房子是准备自住、婚房，还是给孩子装修？我先了解需求，再帮您看预算怎么分配。',
  expensive: '您能进店了解，说明还是重视品质和售后的。便宜有便宜的做法，品质有品质的配置，我们先把差别说清楚。',
  lowPrice: '低价报价不是不能看，但要把材料、环保等级、柜体面积、五金、售后和后期增项逐项对清楚。',
  environment: '环保不靠口头说，主要看检测报告、板材等级和实际品牌配置。',
  afterSale: '装修不是一次性买卖，住进去后有问题能不能找到人很关键。'
}

function includesText(text, keyword) {
  return String(text || '').indexOf(keyword) !== -1
}

function findCommunity(text) {
  const source = String(text || '')
  return communities.find((item) => item.aliases.some((alias) => includesText(source, alias)))
}

function recommendCases(text) {
  const source = String(text || '')
  const matched = cases.filter((item) => includesText(source, item.community) || includesText(source, item.style) || includesText(source, item.area))
  return matched.length ? matched : cases.slice(0, 2)
}

module.exports = {
  brand,
  communities,
  cases,
  lostCases,
  quoteRules,
  inspectionRules,
  salesScripts,
  findCommunity,
  recommendCases
}
