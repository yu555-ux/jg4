# 数据库代码 初步解耦（功能切分）

此目录包含从 `数据库代码.user.js` 中抽出的功能切片，便于后续进一步模块化。
当前阶段仅做“初步解耦”，这些模块尚未被脚本运行时自动加载。

模块说明：
- `modules/01_storage_core.js`: 与酒馆设置/IndexedDB 相关的配置读取与持久化
- `modules/02_template_presets.js`: 模板预设管理
- `modules/03_global_meta_profiles.js`: 全局元信息与隔离档案读写
- `modules/04_logger_toastr.js`: 日志与 Toastr 通知
- `modules/05_template_utils.js`: 表格模板基础工具（seed rows / sheet order）

如需进一步拆分并串接为可运行版本，可在此基础上添加构建脚本或 @require 机制。
- `modules/06_table_guide.js`: 表格引导数据读写与隔离Key桥接
- `modules/07_table_seed_order.js`: seed rows 与表格顺序/重排
- `modules/08_table_sanitize_and_locks.js`: 表格数据存储瘦身、锁定与索引序列
- `modules/09_table_edit_parser.js`: <tableEdit> 解析与表格编辑应用

