# AI 旅行规划师 (AI Travel Planner)

一个基于现代Web技术栈的智能旅行规划应用，通过AI了解用户需求，自动生成详细的旅行路线和建议，并提供实时旅行辅助。

## 🌟 主要功能

### 🎯 智能行程规划
- **文字输入**: 支持详细的旅行需求输入（目的地、日期、预算、同行人数、旅行偏好）
- **语音输入**: 基于浏览器原生语音识别或科大讯飞API的语音输入功能
- **AI生成**: 智能生成个性化的旅行路线，包括交通、住宿、景点、餐厅等详细信息
- **地图可视化**: 集成高德地图API，直观展示行程地点

### 💰 费用预算与管理
- **预算分析**: AI进行智能预算分析和建议
- **实时记账**: 支持手动和语音记录旅行开销
- **费用分类**: 自动分类交通、住宿、餐饮、购物等费用
- **预算监控**: 实时显示预算使用情况，超支预警

### 👤 用户管理与数据存储
- **注册登录系统**: 完整的用户认证功能
- **云端同步**: 基于Supabase的数据存储和同步（主存储）
- **本地存储**: 本地存储作为兜底备份
- **多设备支持**: 跨设备访问和编辑旅行计划
- **数据安全**: 本地存储API密钥，确保数据安全

## 🛠️ 技术栈

### 前端技术
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS + Headless UI
- **路由**: React Router v6
- **状态管理**: Zustand
- **表单处理**: React Hook Form + Zod
- **HTTP客户端**: Axios

### 第三方服务
- **数据库/认证**: Supabase (主存储)
- **AI服务**: OpenAI API / 智谱AI GLM API
- **语音识别**: 科大讯飞API / 浏览器原生Web Speech API
- **地图服务**: 高德地图API
- **图标**: Heroicons

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd ai-travel-planner
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，添加必要的API密钥：
```env
# OpenAI API配置（可选，用于AI行程规划）
VITE_OPENAI_API_KEY=your_openai_api_key

# 科大讯飞语音识别配置（可选）
VITE_XUNFEI_APP_ID=your_xunfei_app_id
VITE_XUNFEI_API_KEY=your_xunfei_api_key
VITE_XUNFEI_API_SECRET=your_xunfei_api_secret

# 高德地图API配置（可选）
VITE_AMAP_KEY=your_amap_key
```

4. **Supabase配置**
   - 创建Supabase项目
   - 运行 `SUPABASE_SETUP.md` 中的SQL脚本创建表结构
   - 在应用设置页面配置Supabase URL和Anon Key

5. **启动开发服务器**
```bash
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 查看应用。

### 生产部署

```bash
npm run build
npm run preview
```

## 📁 项目结构

```
src/
├── components/           # 组件目录
│   ├── ui/              # 基础UI组件
│   ├── layout/          # 布局组件
│   └── features/        # 功能组件
├── pages/               # 页面组件
│   ├── auth/           # 认证页面
│   ├── dashboard/      # 仪表板
│   ├── travel/         # 旅行相关页面
│   └── settings/       # 设置页面
├── services/           # 服务层
│   ├── api/           # HTTP客户端
│   ├── auth/          # 认证服务
│   ├── sync/          # 数据同步服务
│   └── ai/            # AI服务
├── stores/            # 状态管理
├── types/             # TypeScript类型定义
├── utils/             # 工具函数
└── router/            # 路由配置
```

## 🔧 配置说明

### API密钥配置

应用支持多种API服务，密钥配置非常灵活：

1. **必需配置**
   - **Supabase**: 用于数据存储和用户认证
   - 在应用设置页面中配置（推荐方式）

2. **可选配置**
   - **OpenAI API**: 用于智能行程规划，不配置时使用预设模板
   - **科大讯飞**: 用于语音识别，不配置时使用浏览器原生API
   - **高德地图**: 用于地图显示，不配置时显示占位符

### 本地配置

所有API密钥都可以在应用的"设置"页面中配置，配置数据安全存储在本地浏览器中。

## 🎨 功能特性

### 🗺️ 地图集成
- 高德地图API集成
- 行程地点可视化
- 交互式地图控件

### 🎤 语音输入
- 支持中文语音识别
- 语音解析费用记录
- 实时语音反馈

### 🤖 AI智能规划
- 基于用户偏好的个性化行程
- 智能预算分析
- 旅行建议和推荐

### 📊 数据管理
- 实时数据同步（Supabase为主，本地为辅）
- 离线数据缓存
- 多设备支持

## 🔐 安全特性

- API密钥本地存储，不上传服务器
- 安全的认证流程
- 数据传输加密
- 输入验证和XSS防护

## 📱 响应式设计

应用采用响应式设计，支持：
- 桌面端完整功能
- 平板端优化布局
- 移动端核心功能

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有建议，请：

1. 查看 [常见问题](docs/FAQ.md)
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)

## 🗺️ 路线图

- [ ] 添加更多地图服务支持
- [ ] 实现离线模式
- [ ] 添加行程分享功能
- [ ] 支持更多语言
- [ ] 移动端App版本
- [ ] 社交功能

## 📊 开发状态

项目目前处于活跃开发状态，核心功能已完成：

✅ 用户认证系统
✅ 智能行程规划
✅ 费用预算管理
✅ 地图集成
✅ 语音输入
✅ API配置管理
✅ Supabase数据同步

---

**Made with ❤️ by AI Travel Planner Team**