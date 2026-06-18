const flows = [
  {
    key: 'customer',
    title: '客户需求整理',
    desc: '整理客户信息、判断成交障碍，并生成下一步跟进话术。',
    fields: [
      { key: 'name', label: '客户称呼', type: 'input', placeholder: '例如：王姐、李先生' },
      { key: 'community', label: '小区/位置', type: 'input', placeholder: '例如：万硕小区、南街小二楼' },
      { key: 'area', label: '面积/户型', type: 'input', placeholder: '例如：120平，三室两厅' },
      { key: 'budget', label: '客户预算', type: 'input', placeholder: '例如：8-10万，预算偏紧' },
      { key: 'style', label: '喜欢风格', type: 'input', placeholder: '例如：新中式、意式轻奢、原木风' },
      { key: 'stage', label: '当前阶段', type: 'select', options: ['刚咨询', '已到店', '已量房', '已看样板间', '已出图', '已报价', '准备签单'] },
      { key: 'notes', label: '原始记录', type: 'textarea', placeholder: '粘贴微信聊天、语音转文字、老板娘口述或设计师笔记' }
    ],
    sample: {
      name: '王姐',
      community: '交城万硕小区',
      area: '128平，三室两厅两卫',
      budget: '客户说想控制在10万以内，但对效果要求高',
      style: '意式轻奢，喜欢干净高级，不要太复杂',
      stage: '已到店',
      notes: '客户主要关心价格、环保、售后。她看过别家报价，觉得我们可能贵。家里有孩子，希望板材环保。想多做柜子，但又怕超预算。'
    }
  },
  {
    key: 'quote',
    title: '报价话术和利润风险',
    desc: '把报价讲成人能听懂的话，并提醒哪些地方不能乱让价。',
    fields: [
      { key: 'name', label: '客户称呼', type: 'input', placeholder: '例如：王姐' },
      { key: 'project', label: '项目情况', type: 'input', placeholder: '例如：旧房翻新/新房整装/全屋定制' },
      { key: 'budget', label: '客户预算', type: 'input', placeholder: '例如：客户预期8万，我们报价12万' },
      { key: 'quote', label: '报价要点', type: 'textarea', placeholder: '粘贴报价核心项目：水电、瓦工、木工、油工、柜子、主材等' },
      { key: 'competitor', label: '客户拿来对比的低价', type: 'textarea', placeholder: '如果有，写别家报价或客户原话' },
      { key: 'concern', label: '客户最纠结的问题', type: 'textarea', placeholder: '例如：觉得贵、担心环保、不懂工艺、怕后期增项' }
    ],
    sample: {
      name: '王姐',
      project: '128平新房整装，含柜子和部分主材',
      budget: '客户想10万以内，我们初步预算12-14万',
      quote: '水电、防水、瓷砖铺贴、墙面基层、全屋柜子、木门、五金。柜子和水电占比较高。',
      competitor: '客户说别家能10万做完，但没看到详细材料和工艺。',
      concern: '客户卡在价格，担心我们贵，不知道钱花在哪里。'
    }
  },
  {
    key: 'handoff',
    title: '施工交底表',
    desc: '把客户要求、设计方案、报价项目整理成工长能看懂的交底。',
    fields: [
      { key: 'project', label: '项目名称', type: 'input', placeholder: '例如：南街小二楼新中式' },
      { key: 'customer', label: '客户重点', type: 'textarea', placeholder: '客户最在意什么，有哪些不能忘的要求' },
      { key: 'layout', label: '设计/拆改要点', type: 'textarea', placeholder: '哪些墙要拆，哪些垭口、背景墙、柜子要确认' },
      { key: 'water', label: '水电/基装要点', type: 'textarea', placeholder: '水电、防水、墙面、地面、旧房基装风险' },
      { key: 'custom', label: '定制/安装要点', type: 'textarea', placeholder: '衣柜、木门、橱柜、五金、安装注意事项' },
      { key: 'promise', label: '口头承诺/赠品/风险', type: 'textarea', placeholder: '送礼、赠品、客户口头要求，全部写清' }
    ],
    sample: {
      project: '南街小二楼新中式',
      customer: '客户家人意见多，女儿想做月亮门，老人不想预算太高。客户不想后期加钱。',
      layout: '客厅影视墙可能取消；垭口是否做月亮门需二次确认；厨房和餐厅动线要保持宽敞。',
      water: '旧房局部改造，水电按实际发生；卫生间防水和厨房插座需提前确认。',
      custom: '衣柜内部格局后续用K20确认；安装前复核墙面垂直度和地面水平。',
      promise: '到店礼和赠品必须写入备注，不能口头答应后忘记。'
    }
  },
  {
    key: 'inspection',
    title: '工地巡检清单',
    desc: '按施工阶段生成老齐巡检检查表，也可改成短视频口播。',
    fields: [
      { key: 'project', label: '项目名称', type: 'input', placeholder: '例如：万硕小区128平' },
      { key: 'stage', label: '巡检阶段', type: 'select', options: ['开工交底', '拆改', '水电', '防水', '瓦工', '木工', '油工刮墙', '定制安装', '竣工验收'] },
      { key: 'risk', label: '已知风险', type: 'textarea', placeholder: '例如：客户预算低要求高，墙面基层差，定制安装复杂' },
      { key: 'notes', label: '现场备注', type: 'textarea', placeholder: '现场发现的问题或要重点提醒工人的事项' }
    ],
    sample: {
      project: '万硕小区128平',
      stage: '水电',
      risk: '客户家电较多，厨房插座容易不够。客户预算紧，但对品质要求高。',
      notes: '厨房、卫生间、电视墙、卧室床头插座重点复核；水管打压必须拍照。'
    }
  },
  {
    key: 'transparentSite',
    title: '透明工地日报',
    desc: '把现场照片、阶段进度和异常问题整理成业主能看懂的进度更新。',
    fields: [
      { key: 'project', label: '工地名称', type: 'input', placeholder: '例如：万硕花园148平新中式' },
      { key: 'owner', label: '业主称呼', type: 'input', placeholder: '例如：王姐、李先生' },
      { key: 'manager', label: '负责人', type: 'input', placeholder: '例如：老齐 / 王淑辉 / 工长张师傅' },
      { key: 'stage', label: '当前阶段', type: 'select', options: ['开工交底', '拆改', '水电定位', '水电验收', '防水/闭水', '瓦工', '木工/吊顶', '油工/刮墙', '定制安装', '竣工验收'] },
      { key: 'done', label: '今天完成了什么', type: 'textarea', placeholder: '例如：厨房水路复核、卫生间点位确认、客厅电视墙插座定位' },
      { key: 'photos', label: '照片说明', type: 'textarea', placeholder: '例如：照片1厨房水路，照片2卫生间水管，照片3电视墙插座' },
      { key: 'photoFiles', label: '现场照片', type: 'photos', placeholder: '照片只在本机预览，不上传云端' },
      { key: 'issues', label: '异常/风险/变更', type: 'textarea', placeholder: '例如：客户新增扫地机器人插座；卧室床头位置需二次确认' },
      { key: 'confirm', label: '需要客户确认', type: 'textarea', placeholder: '例如：床头插座高度、阳台扫地机器人插座位置' },
      { key: 'next', label: '下一步安排', type: 'textarea', placeholder: '例如：明天水管打压，验收后进入防水阶段' },
      { key: 'tone', label: '发送语气', type: 'select', options: ['稳妥正式', '老板娘温柔', '老齐说真话', '简短微信版'] }
    ],
    sample: {
      project: '万硕花园148平新中式',
      owner: '王姐',
      manager: '老齐 / 王淑辉',
      stage: '水电验收',
      done: '厨房和卫生间水路已复核；客厅电视墙插座已定位；卧室床头双控位置已确认；阳台预留扫地机器人插座。',
      photos: '照片1：厨房水路；照片2：卫生间水管；照片3：客厅电视墙插座；照片4：卧室床头双控。',
      issues: '阳台扫地机器人插座属于新增需求，需要确认是否按新增点位执行；卧室床头高度建议今天微信确认留底。',
      confirm: '请确认卧室床头插座高度和阳台扫地机器人插座位置。',
      next: '明天做水管打压和水电验收复核，确认后进入防水阶段。',
      tone: '老板娘温柔'
    }
  },
  {
    key: 'content',
    title: '案例内容生成',
    desc: '把完工案例或工地素材生成朋友圈、小红书、抖音脚本和提词卡。',
    fields: [
      { key: 'casePreset', label: '选择真实案例', type: 'select', options: ['自定义填写', '万硕花园经典美式', '公园里128平意式轻奢婚房', '万硕花园148平新中式'] },
      { key: 'caseName', label: '案例名称', type: 'input', placeholder: '例如：万硕小区意式轻奢' },
      { key: 'area', label: '面积/预算', type: 'input', placeholder: '例如：128平，硬装约12万' },
      { key: 'style', label: '风格', type: 'input', placeholder: '例如：意式轻奢、新中式、美式' },
      { key: 'highlights', label: '亮点', type: 'textarea', placeholder: '写3-5个亮点：灯光、柜子、背景墙、收纳、环保等' },
      { key: 'audience', label: '想吸引的客户', type: 'select', options: ['中高端新房客户', '旧房翻新客户', '婚房客户', '全屋定制客户', '父母房/适老化客户'] },
      { key: 'tone', label: '口播风格', type: 'select', options: ['老板娘温柔讲解', '老齐说真话', '设计师专业讲解', '短平快获客'] }
    ],
    sample: {
      casePreset: '公园里128平意式轻奢婚房',
      caseName: '公园里128平意式轻奢婚房',
      area: '128平，报价总计约21.18万',
      style: '意式轻奢',
      highlights: '新婚婚房；客户喜欢意式轻奢和偏暗高级感；客厅全部上墙板；圆弧无主灯；三个卧室一个做衣帽间；家里偏用智能电器。',
      audience: '中高端新房客户',
      tone: '老板娘温柔讲解'
    }
  },
  {
    key: 'style',
    title: '三套风格方向',
    desc: '客户拿不定风格时，先生成三套方向和讲解话术。',
    fields: [
      { key: 'project', label: '项目情况', type: 'input', placeholder: '例如：128平三室两厅，新房' },
      { key: 'budget', label: '预算范围', type: 'input', placeholder: '例如：10-15万' },
      { key: 'family', label: '家庭成员/生活习惯', type: 'textarea', placeholder: '例如：夫妻+孩子，老人偶尔住，喜欢收纳' },
      { key: 'likes', label: '客户喜欢/不喜欢', type: 'textarea', placeholder: '客户参考图、抖音小红书喜好、家人意见' },
      { key: 'constraints', label: '落地限制', type: 'textarea', placeholder: '不能拆的墙、预算限制、采光、层高、柜子需求' }
    ],
    sample: {
      project: '128平三室两厅，新房',
      budget: '10-15万',
      family: '夫妻和一个孩子，老人偶尔来住，需要大量收纳。',
      likes: '客户喜欢意式轻奢和新中式，女儿想要月亮门，老人怕太贵太复杂。',
      constraints: '预算不能太高，背景墙可以简化，柜子要多，尽量耐看。'
    }
  }
]

const caseLibrary = {
  '万硕花园经典美式': {
    caseName: '万硕花园经典美式',
    area: '面积未标注，四卧改善型；报价总计约28.51万',
    style: '经典美式',
    highlights: '改善型装修；客户喜欢复杂造型和罗马柱；四个卧室，一个做衣帽间，一个做榻榻米房；全屋中央空调；主卧卫生间做玻璃隔断；深色木作和全屋定制占比较高。',
    audience: '中高端新房客户',
    tone: '老板娘温柔讲解',
    angle: '适合讲复杂美式造型、罗马柱、全屋定制和预算拆解。'
  },
  '公园里128平意式轻奢婚房': {
    caseName: '公园里128平意式轻奢婚房',
    area: '128平，报价总计约21.18万',
    style: '意式轻奢',
    highlights: '新婚婚房；客户喜欢意式轻奢和偏暗高级感；不想要千篇一律造型；客厅全部上墙板；圆弧无主灯；三个卧室一个做衣帽间；家里偏用智能电器；消费水平中高。',
    audience: '中高端新房客户',
    tone: '老板娘温柔讲解',
    angle: '适合讲婚房、墙板、无主灯、智能电器和年轻人高级感。'
  },
  '万硕花园148平新中式': {
    caseName: '万硕花园148平新中式',
    area: '148平，四室两厅两卫两阳台；报价总计约24.88万',
    style: '新中式',
    highlights: '年轻夫妻带一个小宝宝；四个房间，其中一个做书房；阳台需要全自动扫地机器人；客户初期没有太多想法，主要看设计师设计后期调整；木色柜体、山水背景、书房和现代生活动线结合。',
    audience: '中高端新房客户',
    tone: '设计师专业讲解',
    angle: '适合讲年轻家庭新中式、书房规划、宝宝家庭和设计师主导方案。'
  }
}

function getFlow(key) {
  return flows.find((item) => item.key === key) || flows[0]
}

function value(data, key, fallback) {
  const defaultText = fallback === undefined ? '未填写' : fallback
  const text = (data[key] || '').trim()
  return text || defaultText
}

function caseValue(data, key, fallback) {
  const text = (data[key] || '').trim()
  if (text) return text
  const preset = caseLibrary[data.casePreset]
  return preset && preset[key] ? preset[key] : (fallback || '未填写')
}

function joinList(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

function generateOutput(flowKey, data, photoNames) {
  const generators = {
    customer: generateCustomer,
    quote: generateQuote,
    handoff: generateHandoff,
    inspection: generateInspection,
    transparentSite: generateTransparentSite,
    content: generateContent,
    style: generateStyle
  }
  return generators[flowKey](data, photoNames || [])
}

function generateCustomer(data) {
  return `# 客户需求卡

客户：${value(data, 'name')}
小区：${value(data, 'community')}
面积/户型：${value(data, 'area')}
预算预期：${value(data, 'budget')}
风格偏好：${value(data, 'style')}
当前阶段：${value(data, 'stage')}

## 原始记录摘要
${value(data, 'notes')}

## 客户画像判断
这个客户需要先判断是不是晟景的目标客户：中高端、重视品质、能接受一线品牌和环保材料。如果客户只追求最低价，要提前筛选，避免消耗太多时间。

## 主要成交障碍
1. 价格是否超出心理预期。
2. 是否担心环保、售后和材料品质。
3. 是否拿别家低价报价对比。
4. 是否需要家人共同决策。

## 给胡秀芬的话术
姐，咱先不着急谈总价。我先帮你把预算拆开，看哪些钱必须花，哪些地方可以调整。晟景做的是中高端品质，不是最低价，但会把每一项钱花在哪里给你说清楚。

## 给设计师的注意点
1. 先做一版稳妥方案，避免造型过多导致预算超。
2. 柜子、水电、防水、板材环保要重点讲。
3. 如果客户方向不定，先出三套风格方向，不要直接深做效果图。

## 下一步动作
1. 邀约到店看材料和案例。
2. 让客户发户型图或安排量房。
3. 准备一版预算区间，不要只给总价。
4. 如果客户有别家报价，让客户带来做对比分析。

## 可复制给客户的微信
姐，你把户型图和大概预算发我，我先帮你看一下。咱不先谈签不签，先把你家大概要花多少钱、哪些地方容易超预算、哪些地方能省，给你说清楚。`
}

function generateQuote(data) {
  return `# 报价解释和利润风险

客户：${value(data, 'name')}
项目：${value(data, 'project')}
预算情况：${value(data, 'budget')}

## 报价要点
${value(data, 'quote')}

## 竞品/低价对比
${value(data, 'competitor')}

## 客户纠结点
${value(data, 'concern')}

## 利润风险判断
风险等级：中高

风险原因：
1. 客户容易只看总价，不看材料和工艺。
2. 如果为签单盲目压价，后期利润会被水电、基装、定制安装吃掉。
3. 旧房翻新、定制安装、水电改造不能轻易承诺一口价。

## 不能轻易让价的项目
1. 水电改造。
2. 防水。
3. 墙面基层和刮墙。
4. 定制安装和五金。
5. 板材环保等级。

## 可以调整预算的项目
1. 背景墙复杂造型。
2. 局部吊顶。
3. 软装和后期搭配。
4. 部分装饰性灯具。
5. 非必要柜体数量。

## 30秒话术
姐，咱不是说别人便宜就一定不好，也不是说晟景贵就一定适合你。咱先把钱拆开看，水电、防水、板材、五金和售后，这些是以后天天住、天天用的地方。这些地方省了，后期维修比现在省的钱更多。

## 对低价报价的回应
你可以把别家的报价带过来，咱们不说谁好谁坏，只逐项对。看水电怎么算、防水怎么做、板材是什么、五金是什么、售后怎么写。比明细，比材料，比工艺，比售后，比完你心里就清楚了。`
}

function generateHandoff(data) {
  return `# 施工交底表

项目：${value(data, 'project')}

## 客户重点
${value(data, 'customer')}

## 设计/拆改要点
${value(data, 'layout')}

## 水电/基装要点
${value(data, 'water')}

## 定制/安装要点
${value(data, 'custom')}

## 口头承诺/赠品/风险
${value(data, 'promise')}

## 交底清单
1. 开工前和客户确认最终平面布置。
2. 拆改位置必须拍照留底，拆多少、保留哪里写清楚。
3. 水电定位必须客户确认后施工。
4. 厨房、卫生间、防水、水管打压必须留影像记录。
5. 定制安装前复核墙面垂直度、地面水平、门洞尺寸。
6. 客户临时改动必须微信确认，不接受纯口头变更。
7. 赠品、到店礼、加送项目必须写入备注。
8. 每个节点完工后拍照发群，老齐或负责人确认。

## 给工长的重点提醒
这个项目最容易出问题的是“客户要求变动”和“交接不清”。所有变更必须留文字记录，水电、定制、刮墙这些节点不能凭经验省步骤。

## 给客户确认的话术
姐，施工前咱把拆改、水电、柜子和赠送项目再确认一遍。后面只要有变动，咱们都在微信里确认，避免后期说不清。`
}

function generateInspection(data) {
  const stage = value(data, 'stage')
  const stageMap = {
    '开工交底': ['确认钥匙、水电总阀、施工时间', '保护入户门、电梯、公共区域', '确认拆改和保留项目', '建施工群，明确负责人'],
    '拆改': ['核对拆改位置和尺寸', '承重墙不动', '垃圾及时清运', '拆改后拍照留底'],
    '水电': ['水电定位客户确认', '强弱电分开', '水管打压拍照', '厨房卫生间插座复核'],
    '防水': ['基层清理', '墙地面涂刷高度确认', '闭水试验', '拍照留档'],
    '瓦工': ['瓷砖空鼓检查', '坡度和地漏排水', '阳角处理', '砖缝对齐'],
    '木工': ['吊顶龙骨间距', '检修口预留', '造型尺寸复核', '柜体衔接位置确认'],
    '油工刮墙': ['墙面基层处理', '阴阳角顺直', '腻子遍数', '打磨和平整度'],
    '定制安装': ['柜体尺寸复核', '门板缝隙', '五金开合', '收口和墙面衔接'],
    '竣工验收': ['水电试用', '门柜开合', '墙地面检查', '客户签字确认']
  }
  const checks = stageMap[stage] || stageMap['水电']
  return `# 工地巡检清单

项目：${value(data, 'project')}
阶段：${stage}

## 已知风险
${value(data, 'risk')}

## 现场备注
${value(data, 'notes')}

## 本阶段必查项目
${joinList(checks)}

## 老齐现场口播脚本
今天到${value(data, 'project')}看工地，现在是${stage}阶段。这个阶段最怕的不是做得慢，是前面没确认清楚、后面返工。今天我主要看这几项：${checks.slice(0, 3).join('、')}。交城装修想少踩坑，每个节点都得有人盯。

## 发现问题记录
- 问题1：
- 责任人：
- 处理时间：
- 是否通知客户：

## 交付给客户的话
今天工地巡检完成，${stage}阶段重点项目已经检查。后续如果有调整，我们会先在微信里和你确认，再安排工人施工。`
}

function generateTransparentSite(data, photoNames) {
  const stage = value(data, 'stage')
  const stageOrder = ['开工交底', '拆改', '水电定位', '水电验收', '防水/闭水', '瓦工', '木工/吊顶', '油工/刮墙', '定制安装', '竣工验收']
  const stageChecks = {
    '开工交底': ['施工保护是否到位', '拆改范围是否确认', '水电初步点位是否确认', '口头承诺和赠品是否写清'],
    '拆改': ['拆改前后照片是否完整', '承重和风险位置是否避开', '垃圾清运是否安排', '是否产生新增项目'],
    '水电定位': ['厨房、卫生间、电视墙、床头点位是否确认', '空调、冰箱、洗衣机等大功率电器是否单独考虑', '客户确认是否留微信记录', '后期柜体是否影响点位'],
    '水电验收': ['强弱电间距是否合适', '水管走向是否拍照', '水管打压是否留记录', '厨卫水电照片是否完整'],
    '防水/闭水': ['基层是否清理', '阴阳角是否处理', '防水高度是否符合要求', '闭水时间和楼下确认是否留记录'],
    '瓦工': ['瓷砖铺贴是否平整', '地漏坡度是否复核', '空鼓是否检查', '阳角和对缝是否处理'],
    '木工/吊顶': ['龙骨和吊顶结构是否复核', '检修口是否预留', '灯带和筒灯位置是否确认', '空调/新风/柜体是否冲突'],
    '油工/刮墙': ['墙面基层是否处理', '阴阳角是否顺直', '腻子和打磨是否到位', '乳胶漆颜色是否确认'],
    '定制安装': ['柜体尺寸是否复核', '门板缝隙是否均匀', '五金开合是否顺畅', '收口和墙面衔接是否处理'],
    '竣工验收': ['水电是否试用', '柜门和五金是否检查', '墙地面是否检查', '售后说明是否交代']
  }
  const stageIndex = Math.max(stageOrder.indexOf(stage), 0)
  const progress = Math.round(((stageIndex + 1) / stageOrder.length) * 100)
  const checks = stageChecks[stage] || stageChecks['水电验收']
  const issues = value(data, 'issues', '')
  const confirm = value(data, 'confirm', '')
  const hasIssues = issues.trim() !== ''
  const hasConfirm = confirm.trim() !== ''
  const tone = value(data, 'tone')
  const fileList = photoNames.length ? `已选择照片：\n${joinList(photoNames)}` : ''
  const photoNotes = [value(data, 'photos', ''), fileList].filter((item) => item.trim()).join('\n\n') || '未填写'
  const greeting = tone === '老板娘温柔' ? `${value(data, 'owner')}，今天工地这边给您同步一下：` : `${value(data, 'owner')}，今日工地进度同步：`
  const ending = tone === '老齐说真话'
    ? '这些节点提前说清楚，后面就少返工、少扯皮。'
    : '我们会把关键节点都拍照留底，您不用天天跑工地，也能知道现场做到哪一步。'

  return `# 透明工地日报

项目：${value(data, 'project')}
业主：${value(data, 'owner')}
负责人：${value(data, 'manager')}
当前阶段：${stage}
参考进度：${progress}%

## 一、发给业主的进度更新

${greeting}

今天主要完成：
${value(data, 'done')}

现场照片说明：
${photoNotes}

${hasIssues ? `现场需要说明的情况：\n${issues}` : '现场需要说明的情况：暂无明显异常。'}

${hasConfirm ? `需要您确认：\n${confirm}` : '需要您确认：暂无。'}

下一步安排：
${value(data, 'next')}

${ending}

## 二、老齐内部闭环

风险等级：${hasIssues || hasConfirm ? '中' : '低'}

今日必须闭环：
1. 照片是否完整发到工地群。
2. 需要客户确认的事项是否微信留底。
3. 异常/变更是否明确责任人和处理时间。
4. 下一步施工前，工长是否已收到交底。

## 三、本阶段检查重点
${joinList(checks)}

## 四、工地群简短版

【${value(data, 'project')}｜${stage}】
今日完成：${value(data, 'done')}
照片：${photoNotes}
需确认：${hasConfirm ? confirm : '暂无'}
下一步：${value(data, 'next')}

## 五、可沉淀成内容的选题

1. 交城装修为什么每个工序都要拍照留底？
2. ${stage}阶段最容易忽略的3个细节。
3. 晟景透明工地：客户不用天天跑，也能知道现场做到哪一步。
4. 老齐巡工：今天这个节点我主要看什么？
5. 老板娘给业主同步工地，为什么能减少装修焦虑？`
}

function generateContent(data) {
  const preset = caseLibrary[data.casePreset]
  const caseName = caseValue(data, 'caseName')
  const area = caseValue(data, 'area')
  const style = caseValue(data, 'style')
  const highlights = caseValue(data, 'highlights')
  const audience = preset && preset.audience ? preset.audience : value(data, 'audience')
  const tone = preset && preset.tone ? preset.tone : value(data, 'tone')
  const angle = preset && preset.angle ? preset.angle : '根据案例亮点拆解客户最关心的效果、预算和落地细节。'
  return `# 案例内容生成

案例：${caseName}
面积/预算：${area}
风格：${style}
目标客户：${audience}
口播风格：${tone}

## 案例亮点
${highlights}

## 推荐切入角度
${angle}

## 抖音标题
交城${style}案例，钱花在哪里一眼看明白

## 60秒抖音口播
开头：
交城准备装修的，看一下这套${caseName}。

中间：
这套房子最值得讲的不是单纯好看，而是每个需求都对应到真实生活。${highlights}

如果你家也想做这种效果，我建议先别急着问总价，先看预算花在哪里。水电、柜子、板材、五金、墙板和安装这些地方，才是以后住得舒不舒服的关键。

结尾：
你家如果也准备装修，发户型图给我，我先免费帮你算一版预算。门店在交城南环路康健装饰广场。

## 朋友圈文案
交城${caseName}案例整理。
这套房子不是只看一张效果图，而是把材料、灯光、柜子、生活动线和预算分配讲清楚。
装修最重要的不是一眼惊艳，而是住进去每天都顺手。
准备装修的朋友，可以带户型图来店里坐坐，先把预算算明白。

## 小红书标题
交城装修｜${style}这样做，高级又不乱花钱

## 置顶评论
交城装修、旧房翻新、全屋定制，发户型图免费算预算。门店在南环路康健装饰广场。`
}

function generateStyle(data) {
  return `# 三套风格方向

项目：${value(data, 'project')}
预算：${value(data, 'budget')}
家庭情况：${value(data, 'family')}
客户喜好：${value(data, 'likes')}
落地限制：${value(data, 'constraints')}

## 方案A：稳妥耐看型
风格建议：现代原木 / 简洁轻奢

适合原因：
预算可控，落地难度低，客户家人意见多时最容易统一。

设计重点：
1. 减少复杂背景墙。
2. 把钱花在柜子、灯光、板材和五金上。
3. 色彩用浅色和木色，耐看不压抑。

讲解话术：
这套方案不是最惊艳的，但最稳。预算不会失控，后期也不容易过时。

## 方案B：品质提升型
风格建议：意式轻奢 / 新中式简化版

适合原因：
客户想要中高端品质，但不能无限加预算。

设计重点：
1. 客厅做一个视觉重点，其他地方保持简洁。
2. 柜子和灯光提升质感。
3. 材料选择控制在中高端，不做过度造型。

讲解话术：
这套方案适合想要效果、又不想乱花钱的客户。视觉重点有，但不会堆满造型。

## 方案C：惊艳展示型
风格建议：新中式 / 美式 / 东方留白

适合原因：
适合预算更充足、想做样板效果的客户。

设计重点：
1. 背景墙、垭口、灯光和软装统一设计。
2. 需要提前明确哪些造型必须做，哪些可以删。
3. 报价必须提前讲清，防止后期觉得贵。

讲解话术：
这套方案效果最好，但预算也最高。如果您想做出样板间感觉，可以考虑；如果预算要控制，我们就从方案A或B里优化。

## 给设计师的提醒
AI生成的风格方向只做沟通参考。最终落地仍要以CAD尺寸、酷家乐模型、材料和施工条件为准。`
}

module.exports = {
  flows,
  getFlow,
  generateOutput
}
