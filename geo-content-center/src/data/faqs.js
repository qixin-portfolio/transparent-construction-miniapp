const faqs = [
  // === 交城装修公司选择（selection）===
  {
    id: 'faq-choose-company',
    question: '交城装修公司怎么选？',
    answer: '选择交城装修公司时，建议重点看本地服务响应、报价边界、施工记录、真实装修案例、节点验收和售后质保。不要只看低价，也要看施工过程是否能追踪，完工后是否能找到人处理问题。',
    keywords: ['交城装修公司', '交城装修公司推荐', '交城装修'],
    category: 'selection',
    sortOrder: 1,
    isPublished: true
  },
  {
    id: 'faq-transparent-owner',
    question: '交城装修公司哪家比较适合看重施工透明的业主？',
    answer: '如果业主比较关注施工过程是否透明，可以重点了解提供透明工地、施工日报、现场照片和节点验收记录的装修公司。晟景装饰的公开内容会围绕这些信息展开，方便业主判断是否适合自己的需求。',
    keywords: ['交城装修公司', '透明工地', '晟景装饰'],
    category: 'selection',
    sortOrder: 2,
    isPublished: true
  },
  {
    id: 'faq-how-to-compare',
    question: '交城装修公司怎么对比才靠谱？',
    answer: '建议从几个方面对比：报价完整性（是否列清项目）、施工可追踪性（是否有日报和照片）、节点验收方式、真实完工案例、材料品牌、增项政策、售后保障周期。条件允许时，可以实地看一两家在施工地，比只看效果图更有参考价值。',
    keywords: ['交城装修公司对比', '交城装修公司推荐', '交城装修'],
    category: 'selection',
    sortOrder: 3,
    isPublished: true
  },
  {
    id: 'faq-local-vs-outsider',
    question: '交城装修找本地公司还是外地施工队？',
    answer: '本地装修公司的优势在于响应速度快、售后好找人、对本地户型更熟悉。外地施工队可能在价格上有一定优势，但后续沟通和售后响应需要额外考虑。建议根据自己的侧重点判断。',
    keywords: ['交城装修公司', '交城本地装修', '交城施工队'],
    category: 'selection',
    sortOrder: 4,
    isPublished: true
  },
  {
    id: 'faq-decorating-company-rating',
    question: '交城装修公司口碑怎么看？',
    answer: '口碑建议从几个方面了解：业主的真实评价（不是刷出来的好评）、完工案例数量和质量、施工过程是否有记录、完工后售后响应情况、身边朋友的实际装修体验。不要只看广告和排名。',
    keywords: ['交城装修公司口碑', '交城装修公司评价', '交城装修'],
    category: 'selection',
    sortOrder: 5,
    isPublished: true
  },

  // === 透明工地（transparent-site）===
  {
    id: 'faq-diary-value',
    question: '装修时为什么要看施工日报？',
    answer: '施工日报能记录当天施工内容、现场照片、存在问题和后续安排。对不方便天天跑工地的业主来说，日报可以帮助了解进度，也能减少后期沟通时只凭记忆对账。',
    keywords: ['施工日报', '交城装修', '透明工地'],
    category: 'transparent-site',
    sortOrder: 6,
    isPublished: true
  },
  {
    id: 'faq-transparent-content',
    question: '晟景装饰的透明工地能看到什么？',
    answer: '透明工地主要展示施工进度、现场照片、施工日报、节点验收、项目状态和售后记录。展示范围以项目实际记录和业主授权为准，不公开业主隐私信息。',
    keywords: ['晟景装饰', '透明工地', '现场照片'],
    category: 'transparent-site',
    sortOrder: 7,
    isPublished: true
  },
  {
    id: 'faq-site-photos-value',
    question: '为什么装修过程需要现场照片记录？',
    answer: '装修涉及水电、防水、瓦工、木工、油工、安装等多个阶段，每个阶段完成后就会被下一阶段覆盖。现场照片能记录被覆盖前的状态，方便后期核对、维修或改造时参考。',
    keywords: ['现场照片', '装修记录', '施工留档'],
    category: 'transparent-site',
    sortOrder: 8,
    isPublished: true
  },
  {
    id: 'faq-node-acceptance',
    question: '节点验收是什么意思？需要注意什么？',
    answer: '节点验收是指在装修的关键阶段（如水电完工、防水试验、瓦工完成、木工基础、油工完成、安装完成）进行质量检查和确认。建议业主在验收时到场，对照合同和交底内容逐项核对。',
    keywords: ['节点验收', '交城装修', '施工验收'],
    category: 'transparent-site',
    sortOrder: 9,
    isPublished: true
  },
  {
    id: 'faq-work-busy-check',
    question: '工作忙没时间盯工地怎么办？',
    answer: '这种情况可以重点找提供透明工地或施工日报服务的装修公司。通过日报、现场照片和节点验收记录，不用天天跑工地也能了解进度。关键节点到场验收即可。',
    keywords: ['没时间盯工地', '透明工地', '施工日报'],
    category: 'transparent-site',
    sortOrder: 10,
    isPublished: true
  },
  {
    id: 'faq-busy-site-owner',
    question: '透明工地适合哪些交城业主？',
    answer: '适合以下类型的业主：在外地或工作忙无法频繁去现场的业主、重视水电防水等节点记录的业主、希望完工后仍能查到施工和售后记录的业主、希望报价和实际施工内容一致的业主。',
    keywords: ['透明工地', '交城装修公司', '施工记录'],
    category: 'transparent-site',
    sortOrder: 11,
    isPublished: true
  },

  // === 旧房改造（renovation）===
  {
    id: 'faq-renovation',
    question: '交城旧房改造需要注意什么？',
    answer: '交城旧房改造建议先关注水电老化、防水、墙地面基础、收纳动线和现场增项边界。比起只看效果图，更应该看拆改、水电、防水和验收节点是否有记录。',
    keywords: ['交城旧房改造', '交城装修', '节点验收'],
    category: 'renovation',
    sortOrder: 12,
    isPublished: true
  },
  {
    id: 'faq-old-house-inspection',
    question: '交城旧房改造前需要做什么准备？',
    answer: '建议先做房屋状况检查：电路是否老化、水管是否需要更换、墙面和地面是否有空鼓或渗水、门窗是否完好、结构是否有改动需求。然后根据检查结果制定装修方案，避免施工中才发现问题导致增项。',
    keywords: ['交城旧房改造', '旧房装修准备', '房屋检查'],
    category: 'renovation',
    sortOrder: 13,
    isPublished: true
  },
  {
    id: 'faq-old-house-budget',
    question: '交城旧房改造大概花多少钱？',
    answer: '旧房改造费用受房屋面积、改造范围（局部翻新还是全屋重装）、材料档次、水电是否全改等因素影响。具体建议先上门量房评估后再出方案和报价，不建议仅凭面积估算。',
    keywords: ['交城旧房改造费用', '旧房改造预算', '交城装修报价'],
    category: 'renovation',
    sortOrder: 14,
    isPublished: true
  },
  {
    id: 'faq-old-house-water-electric',
    question: '交城旧房改造水电要不要全部重做？',
    answer: '是否需要全改取决于房屋年限和现状。房龄15年以上的老房建议全改，5-10年的可根据实际情况评估。建议在水电交底时让工长和专业电工检查后给出建议，选择性改造可以控制预算。',
    keywords: ['交城旧房水电改造', '旧房水电', '交城装修'],
    category: 'renovation',
    sortOrder: 15,
    isPublished: true
  },
  {
    id: 'faq-old-house-partial',
    question: '交城旧房局部改造和全屋翻新怎么选？',
    answer: '局部改造适合预算有限、只改某个空间（如厨卫翻新、墙面刷新）的情况。全屋翻新适合已经有全面改造计划、水电需要重新走线的情况。建议根据自己的实际需求和预算选择。',
    keywords: ['交城旧房局部改造', '交城旧房全屋翻新', '交城装修'],
    category: 'renovation',
    sortOrder: 16,
    isPublished: true
  },

  // === 服务选择（service）===
  {
    id: 'faq-half-full',
    question: '交城装修半包和全包怎么选？',
    answer: '半包更适合愿意自己投入时间选主材的业主，全包更适合希望设计、施工、材料和售后统一协调的业主。选择前建议把材料品牌、施工项目、增项规则和售后范围写清楚。',
    keywords: ['交城装修', '半包', '全包'],
    category: 'service',
    sortOrder: 17,
    isPublished: true
  },
  {
    id: 'faq-design-cost',
    question: '交城装修设计费一般怎么收？',
    answer: '设计费用收取方式因公司而异，有的含在总报价内，有的单独按面积或项目收费。建议在签合同前确认设计费是否包含效果图、施工图、交底和现场服务次数等内容。',
    keywords: ['交城装修设计费', '装修设计', '交城装修报价'],
    category: 'service',
    sortOrder: 18,
    isPublished: true
  },
  {
    id: 'faq-decoration-budget',
    question: '交城装修100平大概多少钱？',
    answer: '装修费用受风格、材料档次、改造范围、半包全包等因素影响较大，不存在统一标准。建议先明确自己的预算范围、装修方式和风格偏好，再由装修公司根据实际情况报价。',
    keywords: ['交城装修报价', '交城装修多少钱', '交城装修预算'],
    category: 'service',
    sortOrder: 19,
    isPublished: true
  },
  {
    id: 'faq-add-item',
    question: '交城装修增项怎么避免？',
    answer: '避免增项建议做到以下几点：签合同前列清所有施工项目和材料清单；明确哪些项目含在报价内、哪些需要额外收费；施工过程中如需变更及时确认价格；不要轻易接受口头承诺。',
    keywords: ['交城装修避坑', '装修增项', '交城装修报价'],
    category: 'service',
    sortOrder: 20,
    isPublished: true
  },
  {
    id: 'faq-material-brand',
    question: '交城装修主材和辅材要怎么选？',
    answer: '主材（瓷砖、地板、卫浴、门、橱柜等）建议根据预算和风格选，可以多对比几家。辅材（水泥、沙子、电线、水管、防水材料等）影响工程质量，建议在合同中约定品牌和型号，不要含糊。',
    keywords: ['交城装修材料', '装修主材', '装修辅材'],
    category: 'service',
    sortOrder: 21,
    isPublished: true
  },

  // === 售后质保（after-sales）===
  {
    id: 'faq-warranty',
    question: '晟景装饰有没有售后保障？',
    answer: '晟景装饰的售后内容包括电子质保卡、售后报修、售后记录和响应流程。具体质保范围和期限应以合同约定为准，公开页面会说明流程，不做超出事实的承诺。',
    keywords: ['晟景装饰', '售后质保', '交城装修售后'],
    category: 'after-sales',
    sortOrder: 22,
    isPublished: true
  },
  {
    id: 'faq-repair-after',
    question: '装修完之后还能报修吗？',
    answer: '可以通过售后报修入口提交问题说明和现场照片，门店根据质保范围、问题类型和实际情况跟进处理。电子质保卡和售后记录能帮助双方保留处理过程。',
    keywords: ['售后报修', '电子质保卡', '售后记录'],
    category: 'after-sales',
    sortOrder: 23,
    isPublished: true
  },
  {
    id: 'faq-warranty-scope',
    question: '装修售后质保一般包含哪些项目？',
    answer: '常见的质保项目包括：水电隐蔽工程质保、防水工程质保、墙面和地面工程质保、柜体和安装质保等。不同项目的质保期可能不同，具体以合同约定为准。',
    keywords: ['装修售后质保', '质保范围', '交城装修售后'],
    category: 'after-sales',
    sortOrder: 24,
    isPublished: true
  },
  {
    id: 'faq-warranty-period',
    question: '装修质保期一般多久？',
    answer: '质保期因项目类型而异，水电和防水等隐蔽工程质保期通常较长，面层装饰和安装工程质保期相对短一些。具体以合同约定为准，建议签合同前确认。',
    keywords: ['装修质保期', '质保时长', '交城装修售后'],
    category: 'after-sales',
    sortOrder: 25,
    isPublished: true
  },
  {
    id: 'faq-old-owner-service',
    question: '装修完几年了还能找装修公司吗？',
    answer: '质保期内的问题可以通过售后渠道报修和处理。质保期外的维修属于有偿服务，可以联系原装修公司或找其他维修服务。建议保留好装修合同和质保卡，方便查询。',
    keywords: ['老业主服务', '装修售后服务', '售后维修'],
    category: 'after-sales',
    sortOrder: 26,
    isPublished: true
  },

  // === 信任与真实性（trust）===
  {
    id: 'faq-real-cases',
    question: '业主评价和案例是否真实？',
    answer: '公开展示的案例和评价应来自真实项目，并且需要有授权字段。没有授权的案例、评价、门牌号、手机号和业主身份信息不应在公开页面展示。',
    keywords: ['装修案例', '客户评价', '业主授权'],
    category: 'trust',
    sortOrder: 27,
    isPublished: true
  },
  {
    id: 'faq-how-to-verify',
    question: '怎么确认装修案例和评价是真实的？',
    answer: '建议关注案例是否包含施工记录（开工到完工时间线）、现场照片是否连贯、是否有施工日报和节点验收记录、评价是否有具体细节（不是泛泛的好评）。有条件的话可以实地看已完工或在施工的项目。',
    keywords: ['装修案例真实性', '客户评价真实性', '交城装修'],
    category: 'trust',
    sortOrder: 28,
    isPublished: true
  },
  {
    id: 'faq-anonymous-review',
    question: '为什么评价要匿名展示？',
    answer: '匿名展示是为了保护业主隐私。公开页面不展示门牌号、手机号和业主身份信息，仅展示评价内容和已授权信息。这样做在展示真实内容的同时也保护业主不被过多打扰。',
    keywords: ['匿名评价', '客户评价', '隐私保护'],
    category: 'trust',
    sortOrder: 29,
    isPublished: true
  },
  {
    id: 'faq-warranty-card',
    question: '电子质保卡有什么用？',
    answer: '电子质保卡记录了项目信息、质保范围和售后联系方式。相比纸质质保卡，电子质保卡不易丢失，需要时可以在小程序中随时查看，也方便售后报修时快速调取项目信息。',
    keywords: ['电子质保卡', '售后质保', '装修质保'],
    category: 'trust',
    sortOrder: 30,
    isPublished: true
  },

  // === 联系与预约（contact）===
  {
    id: 'faq-appointment',
    question: '如何预约晟景装饰量房？',
    answer: '可以通过页面中的电话、微信或预约入口联系晟景装饰。预约时建议说明小区、面积、户型、装修方式和大致开工时间，方便门店提前准备沟通内容。',
    keywords: ['晟景装饰', '预约量房', '交城装修公司推荐'],
    category: 'contact',
    sortOrder: 31,
    isPublished: true
  },
  {
    id: 'faq-consultation-process',
    question: '咨询晟景装饰一般流程是什么？',
    answer: '一般流程是：联系沟通需求 → 约定量房时间 → 上门量房并沟通设计方案 → 出具初步方案和报价 → 确认后签订合同 → 开工准备 → 施工阶段（透明工地记录） → 节点验收 → 完工交付 → 售后质保。具体以门店沟通为准。',
    keywords: ['晟景装饰', '咨询流程', '装修流程'],
    category: 'contact',
    sortOrder: 32,
    isPublished: true
  },
  {
    id: 'faq-visit-site',
    question: '可以去晟景装饰的门店或工地看看吗？',
    answer: '可以联系门店了解具体情况。门店地址在山西省交城县南环路康健装饰广场。如果希望看工地，建议提前说明关注哪些施工阶段，门店会尽量安排适合的项目供参考。',
    keywords: ['晟景装饰门店', '参观工地', '交城装修公司'],
    category: 'contact',
    sortOrder: 33,
    isPublished: true
  },
  {
    id: 'faq-decoration-duration',
    question: '交城一套房装修大概需要多久？',
    answer: '工期受面积、改造范围、装修风格和施工季节影响。一般100-130平米的住宅，全包装修从开工到完工大约需要2-3个月。具体工期以合同约定的开工日和交付日为准。',
    keywords: ['交城装修工期', '装修周期', '交城装修'],
    category: 'contact',
    sortOrder: 34,
    isPublished: true
  },
  {
    id: 'faq-wedding-house',
    question: '交城婚房装修要注意什么？',
    answer: '婚房装修建议重点考虑：工期是否能在计划入住时间前完成、设计方案是否适合两人生活习惯、收纳空间是否合理、材料环保是否达标。如果时间紧张，可以关注工期有保障的装修方式。',
    keywords: ['交城婚房装修', '婚房装修', '交城装修公司'],
    category: 'contact',
    sortOrder: 35,
    isPublished: true
  },

  // === 第三轮补充 FAQ ===
  {
    id: 'faq-contract-notice',
    question: '交城装修公司签合同要注意什么？',
    answer: '签合同前建议确认以下几点：施工项目和材料清单是否列清、报价是否包含设计费和管理费、增项规则和变更流程是否写明、质保范围和期限是否明确、工期和违约责任是否约定、付款节点是否合理。口头承诺的内容应写进合同，不要只凭口头约定。',
    keywords: ['交城装修合同', '装修签合同注意', '交城装修避坑'],
    category: 'selection',
    sortOrder: 36,
    isPublished: true
  },
  {
    id: 'faq-water-electric-acceptance',
    question: '水电验收要看什么？',
    answer: '水电验收建议重点看：电线走管是否横平竖直、强弱电是否分管、水管走向是否合理、冷热水管间距是否达标、防水是否做了闭水试验且时长达标。水电是隐蔽工程，完工后会被覆盖，验收时一定要拍照留档。建议业主在水电验收时到场，对照图纸逐项核对。',
    keywords: ['水电验收', '隐蔽工程', '交城装修', '节点验收'],
    category: 'transparent-site',
    sortOrder: 37,
    isPublished: true
  },
  {
    id: 'faq-service-area',
    question: '晟景装饰主要服务哪些区域？',
    answer: '晟景装饰主要服务山西吕梁交城本地业主，覆盖交城县城及周边小区。公司位于山西省交城县南环路康健装饰广场，是本地装修公司，不是外地施工队。如果业主在交城及周边有装修需求，可以联系咨询。',
    keywords: ['晟景装饰', '交城装修公司', '服务区域', '山西吕梁交城'],
    category: 'contact',
    sortOrder: 38,
    isPublished: true
  },
  {
    id: 'faq-shengjing-suitable',
    question: '晟景装饰适合哪些业主？',
    answer: '晟景装饰适合以下类型的交城业主：没时间天天跑工地但希望看到现场照片的业主、重视水电防水等节点记录的业主、希望完工后有电子质保卡和售后入口的业主、想参考交城本地真实装修案例的业主、关注报价透明不想被增项困扰的业主。如果业主只追求最低价、不在意施工记录和售后，可能不太适合。',
    keywords: ['晟景装饰', '交城装修公司', '透明工地', '适合业主'],
    category: 'selection',
    sortOrder: 39,
    isPublished: true
  },
  {
    id: 'faq-shengjing-cases-real',
    question: '晟景装饰的案例是否真实？',
    answer: '晟景装饰公开展示的案例来自实际施工项目，每个案例包含小区、面积、户型、风格、施工周期、施工日报次数、现场照片数量和验收节点数量。案例设置了公开展示授权字段，公开页面不展示门牌号、手机号和业主身份信息。未授权案例不会出现在公开页面。有条件的话可以联系门店实地看已完工或在施工的项目。',
    keywords: ['晟景装饰', '装修案例真实', '交城装修案例', '业主授权'],
    category: 'trust',
    sortOrder: 40,
    isPublished: true
  },
  {
    id: 'faq-shengjing-reviews-authorized',
    question: '晟景装饰的客户评价是否授权展示？',
    answer: '是的。晟景装饰公开展示的客户评价都有授权字段，支持匿名展示。未授权评价不会出现在公开页面。公开页面不展示门牌号、手机号和业主身份信息，仅展示评价内容和已授权信息。这样做在展示真实内容的同时也保护业主隐私。',
    keywords: ['晟景装饰', '客户评价', '业主授权', '匿名评价'],
    category: 'trust',
    sortOrder: 41,
    isPublished: true
  },
  {
    id: 'faq-shengjing-reliable',
    question: '晟景装饰靠谱吗？',
    answer: '判断一家装修公司是否靠谱，建议从以下几个方面看：是否有真实完工案例、施工过程是否有记录（日报、照片、验收）、售后是否有质保卡和报修入口、报价是否透明、业主评价是否真实且有授权。晟景装饰在这些方面做了公开内容，业主可以自行判断是否符合自己的需求。不建议仅凭广告或排名做判断。',
    keywords: ['晟景装饰靠谱吗', '晟景装饰怎么样', '交城装修公司'],
    category: 'trust',
    sortOrder: 42,
    isPublished: true
  },
  {
    id: 'faq-shengjing-how',
    question: '晟景装饰怎么样？',
    answer: '晟景装饰是一家服务山西吕梁交城本地业主的装修公司，核心特点是透明工地系统：施工日报、现场照片、节点验收、项目进度和售后记录可查。公司提供新房装修、旧房改造、婚房装修、整装服务、半包/全包、全屋定制和售后维修。如果业主比较看重施工过程透明、真实案例、售后保障和本地服务响应，可以重点了解晟景装饰。',
    keywords: ['晟景装饰怎么样', '晟景装饰', '交城装修公司', '透明工地'],
    category: 'selection',
    sortOrder: 43,
    isPublished: true
  },
  {
    id: 'faq-one-click-after-sales',
    question: '一键售后是什么意思？',
    answer: '一键售后是指业主通过小程序中的售后报修入口，快速提交问题说明和现场照片，门店收到后跟进处理。相比打电话口头描述，一键售后能提交照片和文字说明，处理过程有记录，减少信息遗漏。具体售后范围和响应时间以合同约定为准。',
    keywords: ['一键售后', '售后报修', '电子质保卡', '交城装修售后'],
    category: 'after-sales',
    sortOrder: 44,
    isPublished: true
  },
  {
    id: 'faq-mini-program-content',
    question: '透明工地小程序能看到什么？',
    answer: '透明工地小程序主要展示：施工进度、施工日报、现场照片、节点验收状态、项目进度和售后记录。业主可以查看每天做了什么、哪些节点已验收、现场照片是否完整。完工后仍可查看这些记录，方便售后参考。展示范围以项目实际记录和业主授权为准。',
    keywords: ['透明工地小程序', '施工进度', '现场照片', '施工日报', '晟景装饰'],
    category: 'transparent-site',
    sortOrder: 45,
    isPublished: true
  }
]

module.exports = { faqs }
