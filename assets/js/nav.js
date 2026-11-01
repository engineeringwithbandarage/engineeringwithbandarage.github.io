/* Site map — the single source of truth for navigation.
   Every page's sidebar, breadcrumbs, prev/next links and search come from here.
   To publish a chapter: set ready: true and add its HTML file at <tutorial path>/<file>. */

window.SITE = {
  name: "Engineering With Bandarage",
  tagline: "Deep-dive data engineering tutorials",
  tracks: [
    {
      id: "dbt",
      title: "dbt",
      path: "dbt/index.html",
      tutorials: [
        {
          id: "core-architecture",
          title: "dbt Core Architecture & Internals",
          short: "Core Architecture",
          path: "dbt/core-architecture/",
          chapters: [
            { file: "01-big-picture.html", title: "The Big Picture", desc: "What dbt Core is, the compiler/scheduler/executor model, and the life of a dbt run.", ready: true },
            { file: "02-package-anatomy.html", title: "Package Anatomy", desc: "dbt-core, dbt-common, dbt-adapters, dbt-postgres: the modules and how they plug together.", ready: true },
            { file: "03-cli-and-config.html", title: "CLI & Configuration Loading", desc: "Click, dbtRunner, flags, and how profiles, project, vars and env vars are resolved.", ready: true },
            { file: "04-parser-and-manifest.html", title: "The Parser & the Manifest", desc: "Node types, parse-time Jinja, partial parsing, and manifest.json.", ready: true },
            { file: "05-dag-and-selection.html", title: "The DAG & Node Selection", desc: "How ref/source build the graph, and how the selector engine resolves --select.", ready: true },
            { file: "06-compilation-and-jinja.html", title: "Compilation & the Jinja Engine", desc: "The dbt Jinja environment, context building, and macro resolution order.", ready: true },
            { file: "07-execution-engine.html", title: "The Execution Engine", desc: "Tasks, runners, the thread pool, materializations, and the adapter interface.", ready: true },
            { file: "08-artifacts-and-state.html", title: "Artifacts & State", desc: "run_results.json, catalog.json, state:modified, deferral, and orchestration with Airflow.", ready: true }
          ]
        },
        {
          id: "jinja-advanced",
          title: "Advanced dbt Jinja",
          short: "Advanced Jinja",
          path: "dbt/jinja-advanced/",
          chapters: [
            { part: "Foundations", file: "01-rendering-model.html", title: "How dbt Renders Jinja", desc: "Parse vs. execute, the render context, and compiled vs. run output.", ready: true },
            { part: "Foundations", file: "02-syntax-deep-dive.html", title: "Syntax Deep Dive", desc: "Delimiters, whitespace control, filters, tests and operators.", ready: true },
            { part: "Foundations", file: "03-types-and-scope.html", title: "Data Types & Scope", desc: "Lists, dicts, namespace(), do, and loop scoping rules.", ready: true },
            { part: "The dbt Context", file: "04-context-objects.html", title: "Built-in Context Objects", desc: "this, target, model, config, graph, adapter, modules, env_var, var and more.", ready: true },
            { part: "The dbt Context", file: "05-ref-source-config.html", title: "ref, source & config Internals", desc: "Relation objects, DAG edges, and is_incremental() explained.", ready: true },
            { part: "Macros", file: "06-writing-macros.html", title: "Writing Macros", desc: "Arguments, kwargs/varargs, return(), caller() and recursion.", ready: true },
            { part: "Macros", file: "07-compile-time-queries.html", title: "Compile-time Queries", desc: "run_query, statement blocks, agate tables and the execute guard.", ready: true },
            { part: "Macros", file: "08-dynamic-sql.html", title: "Dynamic SQL Generation", desc: "Pivots, column introspection and SCD2 hash generation.", ready: true },
            { part: "Macros", file: "09-hooks-and-operations.html", title: "Hooks & Operations", desc: "pre/post hooks, on-run-start/end, results and run-operation.", ready: true },
            { part: "Metaprogramming", file: "10-dispatch.html", title: "Dispatch & Adapter Macros", desc: "adapter.dispatch, default__/postgres__ and package overrides.", ready: true },
            { part: "Metaprogramming", file: "11-overriding-internals.html", title: "Overriding dbt Internals", desc: "generate_schema_name, generate_alias_name and environment-aware naming.", ready: true },
            { part: "Metaprogramming", file: "12-custom-materializations.html", title: "Custom Materializations", desc: "Anatomy of a materialization and building an SCD2 one.", ready: true },
            { part: "Metaprogramming", file: "13-custom-tests.html", title: "Custom Generic Tests", desc: "test blocks, parameters, severity and where configs.", ready: true },
            { part: "Metaprogramming", file: "14-graph-object.html", title: "The graph Object", desc: "Walking graph.nodes for grants, docs checks and lineage automation.", ready: true },
            { part: "Engineering Discipline", file: "15-debugging.html", title: "Debugging Jinja", desc: "log, raise_compiler_error, warn, dbt compile and --debug.", ready: true },
            { part: "Engineering Discipline", file: "16-packages.html", title: "Packages", desc: "dbt_utils, dbt_expectations, codegen and building your own.", ready: true },
            { part: "Engineering Discipline", file: "17-anti-patterns.html", title: "Anti-patterns & Performance", desc: "Over-templating, parse-time cost and readability rules.", ready: true },
            { part: "Engineering Discipline", file: "18-capstone.html", title: "Capstone: Metadata-driven Loader", desc: "vars, YAML config, dispatch, hooks and tests on the AdventureWorks lab.", ready: true },
            { part: "Appendices", file: "appendix-a-cheat-sheet.html", num: "A", title: "Context Cheat Sheet", desc: "Every dbt Jinja context member on one page.", ready: true },
            { part: "Appendices", file: "appendix-b-filters.html", num: "B", title: "Filter Reference", desc: "Jinja filters you will actually use in dbt.", ready: true },
            { part: "Appendices", file: "appendix-c-glossary.html", num: "C", title: "Glossary", desc: "Terms used across both tutorials.", ready: true }
          ]
        }
      ]
    },
    {
      id: "architecture",
      title: "Data Architecture Design",
      path: "architecture/index.html",
      tutorials: [
        {
          id: "dbt-airflow-snowflake",
          title: "dbt + Airflow + Snowflake Architecture",
          short: "dbt · Airflow · Snowflake",
          path: "architecture/dbt-airflow-snowflake/",
          chapters: [
            { file: "01-reference-architecture.html", title: "Reference Architecture (ELT)", desc: "Sources, ingestion, Snowflake layers, dbt, Airflow and consumers — the logical design and how a daily run flows.", ready: true },
            { file: "02-deployment-kubernetes.html", title: "Deployment on Kubernetes (EKS)", desc: "Airflow on EKS with the KubernetesExecutor, one image with dbt + Cosmos, PrivateLink to Snowflake, GitHub Actions + Helm.", ready: true },
            { file: "03-deployment-linux-vms.html", title: "Deployment on Linux VMs", desc: "Airflow and dbt in virtualenvs under systemd, CeleryExecutor workers, Ansible releases, firewall and sizing.", ready: true }
          ]
        }
      ]
    },
    {
      id: "datawarehousing",
      title: "Data Warehousing",
      path: "datawarehousing/index.html",
      tutorials: [
        {
          id: "sqlserver-airflow",
          title: "End-to-End Data Warehouse on Linux + Docker: SQL Server 2022 + Airflow",
          short: "SQL Server on Linux + Airflow",
          path: "datawarehousing/sqlserver-airflow/",
          chapters: [
            { part: "Foundations", file: "01-big-picture.html", title: "The Big Picture", desc: "The Linux + Docker infrastructure and deployment diagrams, then what a data warehouse is for, the layers of SBEcoLTDDW, ETL vs ELT and the whole pipeline.", ready: true },
            { part: "Foundations", file: "02-the-lab.html", title: "The Lab", desc: "One Ubuntu VM deployed in AWS, Docker containers, SQL Server 2022, Airflow 2.7, the folder layout and the connections.", ready: true },
            { part: "Foundations", file: "03-dimensional-model.html", title: "Dimensional Modelling", desc: "Grain, facts, dimensions, surrogate keys, the date dimension and the SBEcoLTDDW star schema.", ready: true },
            { part: "Foundations", file: "04-source-system.html", title: "The Source System", desc: "Profiling AdventureWorks2022, defining scope, and the source-to-target mapping.", ready: true },
            { part: "Building the Pipeline", file: "05-staging-extraction.html", title: "Staging & Extraction", desc: "Full vs incremental extracts, watermarks that only move on success, and the audit tables.", ready: true },
            { part: "Building the Pipeline", file: "06-loading-dimensions.html", title: "Loading Dimensions", desc: "A generated date dimension and Customer as SCD Type 1 + Type 2 with a row hash.", ready: true },
            { part: "Building the Pipeline", file: "07-loading-facts.html", title: "Loading Facts", desc: "Scope, smart date keys, point-in-time customer lookups, unknown members and an idempotent MERGE.", ready: true },
            { part: "Engine Features", file: "08-performance.html", title: "Indexed Views & Columnstore", desc: "Measured on the Linux lab: rowstore vs columnstore vs a pre-join and an aggregated indexed view, and columnstore delta stores.", ready: true },
            { part: "Engine Features", file: "09-workload-management.html", title: "Workload Management", desc: "Resource Governor on SQL Server for Linux: a classifier puts the ETL login in its own workload group and pool.", ready: true },
            { part: "Engine Features", file: "10-data-quality.html", title: "The Data Quality Gate", desc: "Five rules, including reconciliation with the live source, that stop bad data from being published.", ready: true },
            { part: "Operating It", file: "11-orchestration-airflow.html", title: "Orchestration with Airflow", desc: "The 26-task DAG step by step: one SQL file per task, task groups, a file-driven deploy group, trigger rules and the SQL operator.", ready: true },
            { part: "Operating It", file: "12-run-fail-rerun.html", title: "Running, Failing & Re-running", desc: "Real runs on the Linux + Docker lab: initial load, no-op, SCD2 change, a failed DQ gate, the fix, a full reload, and retries from the first build.", ready: true },
            { part: "Operating It", file: "13-serving.html", title: "Serving the Data", desc: "Reporting views, historical vs current reporting, and what consumers should and should not query.", ready: true },
            { part: "Appendix", file: "appendix-a-scripts.html", num: "A", title: "Script Index & Gotchas", desc: "Every file in the lab, how to rebuild it, and the SQL Server on Linux surprises we hit.", ready: true }
          ]
        }
      ]
    },
    {
      id: "bi",
      title: "Business Intelligence",
      path: "bi/index.html",
      tutorials: [
        {
          id: "powerbi-modelling",
          title: "Power BI Semantic Modelling: From Warehouse Tables to Trusted Measures",
          short: "Power BI Modelling",
          path: "bi/powerbi-modelling/",
          chapters: [
            { part: "Foundations", file: "01-big-picture.html", title: "The Big Picture", desc: "Where the semantic model sits, the seven rules of the approach, and the Adventure Works P&L built on AdventureWorksDW2022.", ready: true },
            { part: "Foundations", file: "02-star-schema.html", title: "A Star Schema for Power BI", desc: "Grain, internet and reseller orders in one fact, conformed dimensions, many-to-one relationships, a fiscal calendar inside Date, and disconnected helper tables.", ready: true },
            { part: "Foundations", file: "03-getting-data-in.html", title: "Getting Data In", desc: "SQL source queries as the contract, parameters and native queries that fold, import mode, fiscal-year partitions and five traps found in the source.", ready: true },
            { part: "Measures", file: "04-fiscal-calendar.html", title: "The Fiscal Calendar & Time Intelligence", desc: "A 4-4-5 calendar with a 53-week year built in SQL, last year by week ID, a calculation group and a period-to-date selector.", ready: true },
            { part: "Measures", file: "05-measure-architecture.html", title: "Measure Architecture", desc: "One measure table, base → line → derived → analysis layers, numbered P&L lines, display folders, format strings and descriptions.", ready: true },
            { part: "Measures", file: "06-advanced-patterns.html", title: "Advanced Patterns", desc: "Currency conversion row by row, and row-level security by territory.", ready: true },
            { part: "Engineering", file: "07-model-as-code.html", title: "The Model as Code", desc: "PBIP projects with the model in TMDL and the report in PBIR, validation, git, pull-request reviews, Best Practice Analyzer and deployment.", ready: true },
            { part: "Engineering", file: "08-reverse-engineering.html", title: "Reverse-Engineering & Documenting a Model", desc: "Load the TMDL definition, build the measure dependency graph, trace every measure to its SQL source and generate a page per measure.", ready: true },
            { part: "Engineering", file: "09-testing-performance.html", title: "Testing & Performance", desc: "Check every measure compiles, reconcile P&L lines with SQL, test each pattern, measure with a cold cache, and a go-live checklist.", ready: true },
            { part: "Appendix", file: "appendix-a-dax-patterns.html", num: "A", title: "DAX Pattern Cheat Sheet", desc: "Every pattern from the tutorial on one page.", ready: true }
          ]
        }
      ]
    },
    {
      id: "statistics",
      title: "Statistics",
      path: "statistics/index.html",
      tutorials: [
        {
          id: "zero-to-hero",
          title: "Statistics for Daily Use",
          short: "Daily Use",
          path: "statistics/zero-to-hero/",
          chapters: [
            { part: "Foundations", file: "01-big-picture.html", title: "Statistics in One Picture", desc: "Populations, samples, parameters vs. statistics, sampling designs and experiments — with 216 countries and 1,380 Norwegian wildcats.", ready: true },
            { part: "Foundations", file: "02-seeing-data.html", title: "Seeing Data", desc: "Variable types, distributions, shape, center, spread, z-scores, boxplots and misleading graphs — oil fields, prices and countries.", ready: true },
            { part: "Probability", file: "03-probability.html", title: "The Probability Toolkit", desc: "Events, rules, contingency tables, conditional probability, independence, Bayes and counting — exploration wells.", ready: true },
            { part: "Probability", file: "04-distributions.html", title: "Random Variables & Distributions", desc: "Expected value, binomial, Poisson, the normal curve, normal probability plots — and why oil returns are not normal.", ready: true },
            { part: "Probability", file: "05-sampling-clt.html", title: "Sampling Distributions & the CLT", desc: "Sampling error, standard error and the central limit theorem, simulated live on real field sizes.", ready: true },
            { part: "Inference", file: "06-confidence-intervals.html", title: "Confidence Intervals", desc: "z and t intervals, margin of error, sample size, proportions and intervals for a standard deviation.", ready: true },
            { part: "Inference", file: "07-hypothesis-testing.html", title: "The Hypothesis-Testing Engine", desc: "Null and alternative, test statistics, p-values, Type I/II errors, power and the Wilcoxon signed-rank test.", ready: true },
            { part: "Inference", file: "08-two-groups.html", title: "Comparing Two Groups", desc: "Pooled and Welch t, paired t, Mann–Whitney, F-test for spread and two proportions.", ready: true },
            { part: "Inference", file: "09-chi-square.html", title: "Categorical Data & Chi-Square", desc: "Goodness of fit, independence and homogeneity tests on what wildcats find, where and when.", ready: true },
            { part: "Relationships", file: "10-regression.html", title: "Regression & Correlation", desc: "Least squares, R², correlation, slope inference, confidence vs prediction intervals and residual checks — crude to the pump.", ready: true },
            { part: "Relationships", file: "11-anova.html", title: "Analysis of Variance (ANOVA)", desc: "The F-distribution, one-way ANOVA, Tukey multiple comparisons and Kruskal–Wallis.", ready: true },
            { part: "Hero Level", file: "12-hero-level.html", title: "Hero Level: Real-World Methods", desc: "Bootstrap, permutation tests, multiple testing, autocorrelation, Bayesian updating, multiple and logistic regression.", ready: true },
            { part: "Toolkit", file: "test-chooser.html", num: "T", title: "Which Test Do I Use?", desc: "An interactive decision tree over every procedure in the track.", ready: true },
            { part: "Toolkit", file: "formula-sheet.html", num: "F", title: "Formula Sheet", desc: "Every formula on one printable page.", ready: true },
            { part: "Toolkit", file: "data-sources.html", num: "D", title: "Data, Code & Reproducibility", desc: "The open datasets, licences, database schema and how to rerun every number.", ready: true }
          ]
        }
      ]
    },
    {
      id: "ai",
      title: "AI & AI Systems Engineering",
      path: "ai/index.html",
      tutorials: [
        {
          id: "ai-systems-engineering",
          title: "AI Systems Engineering: From Data Platform to Production AI",
          short: "AI Systems Engineering",
          path: "ai/ai-systems-engineering/",
          chapters: [
            { part: "Foundations", file: "01-big-picture.html", title: "The Big Picture", desc: "What an AI system is beyond the model: data, retrieval, tools, evaluation and operations, and where it sits on the data platform.", ready: true },
            { part: "Foundations", file: "02-llms-for-engineers.html", title: "LLMs for Engineers", desc: "Tokens, context windows, sampling, model choice, and the cost and latency trade-offs.", ready: false },
            { part: "Foundations", file: "03-prompts-as-interfaces.html", title: "Prompts as Interfaces", desc: "System prompts, structured output, schemas and versioning prompts like code.", ready: false },
            { part: "Building", file: "04-embeddings-vector-search.html", title: "Embeddings & Vector Search", desc: "Chunking, embedding models, vector indexes in PostgreSQL and hybrid search.", ready: false },
            { part: "Building", file: "05-rag-on-the-warehouse.html", title: "Retrieval-Augmented Generation", desc: "Grounding answers in governed warehouse data and documents, with citations.", ready: false },
            { part: "Building", file: "06-text-to-sql.html", title: "Text-to-SQL on a Semantic Layer", desc: "Letting users ask questions in plain language without bypassing trusted measures.", ready: false },
            { part: "Building", file: "07-tools-and-agents.html", title: "Tool Use & Agents", desc: "Function calling, agent loops, MCP, and when an agent is the wrong design.", ready: false },
            { part: "Operating It", file: "08-evaluation.html", title: "Evaluation", desc: "Test sets, LLM-as-judge, regression tests for prompts and measuring quality over time.", ready: false },
            { part: "Operating It", file: "09-guardrails-security.html", title: "Guardrails, Security & Governance", desc: "Prompt injection, PII, access control and auditability.", ready: false },
            { part: "Operating It", file: "10-llmops.html", title: "LLMOps: Observability, Cost & Caching", desc: "Tracing, token budgets, caching and running AI workloads reliably.", ready: false },
            { part: "Operating It", file: "11-orchestrating-ai-pipelines.html", title: "Orchestrating AI Pipelines with Airflow", desc: "Embedding refreshes, batch inference and evaluation runs as scheduled DAGs.", ready: false },
            { part: "Appendix", file: "appendix-a-glossary.html", num: "A", title: "AI Systems Glossary", desc: "The terms used across the track.", ready: false }
          ]
        }
      ]
    },
    {
      id: "snowflake",
      title: "Snowflake",
      path: "snowflake/index.html",
      tutorials: [
        {
          id: "snowflake-wwi",
          title: "Snowflake Data Platform with dbt and Airflow: WideWorldImporters End to End",
          short: "Snowflake + dbt + Airflow",
          path: "snowflake/wwi-dbt-airflow/",
          chapters: [
            { part: "The Design", file: "00-the-design.html", num: "0", title: "The Complete Design", desc: "All five design diagrams at full size: infrastructure, medallion layers, the source model, the Gold model and the Sales data mart.", ready: true },
            { part: "The Design", file: "01-big-picture.html", title: "The Big Picture", desc: "What we build, the medallion approach, the rules we follow and how one row travels from SQL Server to a Power BI chart.", ready: true },
            { part: "Foundations", file: "02-the-lab.html", title: "The Lab", desc: "An Ubuntu VM in AWS, Docker, Airflow extended with dbt-snowflake, the project folders and the key pair.", ready: true },
            { part: "Foundations", file: "03-source-system.html", title: "The Source System", desc: "WideWorldImporters: four schemas, temporal tables, change columns, a read-only login and a row-level security surprise.", ready: true },
            { part: "Foundations", file: "04-snowflake-setup.html", title: "Setting Up Snowflake", desc: "Warehouses, databases, a stage, three roles, a key-pair service user and a credit monitor, in one script.", ready: true },
            { part: "Loading", file: "05-extract-load-bronze.html", title: "Extract & Load into Bronze", desc: "High-water marks, CSV.gz files, PUT to the stage, COPY INTO and the load audit, with the first real load.", ready: true },
            { part: "Transforming with dbt", file: "06-dbt-project.html", title: "The dbt Project", desc: "Folders as layers, the profile, exact schema names and why 31 staging models are generated.", ready: true },
            { part: "Transforming with dbt", file: "07-silver.html", title: "Silver: Staging, Snapshots & Intermediate", desc: "Latest row per key, real types, SCD Type 2 snapshots and the joined intermediate models.", ready: true },
            { part: "Transforming with dbt", file: "08-gold-dimensions.html", title: "Gold: Conformed Dimensions", desc: "Hash surrogate keys, SCD2 versions, the first-version rule, the unknown member and a fiscal calendar.", ready: true },
            { part: "Transforming with dbt", file: "09-gold-facts.html", title: "Gold: Facts", desc: "Point-in-time dimension lookups, the business rules behind each total, and incremental merges.", ready: true },
            { part: "Transforming with dbt", file: "10-sales-data-mart.html", title: "The Sales Data Mart", desc: "One fact, six dimensions, role-playing keys and the questions the mart answers, with real results.", ready: true },
            { part: "Operating It", file: "11-tests-reconciliation.html", title: "Tests & Reconciliation", desc: "Key and relationship tests, cautious selection, and proving Snowflake matches the source to the cent.", ready: true },
            { part: "Operating It", file: "12-airflow-dag.html", title: "Orchestration with Airflow", desc: "One DAG, ten BashOperator tasks, the task order and a real scheduled run.", ready: true },
            { part: "Appendix", file: "appendix-a-commands.html", num: "A", title: "Commands & File Index", desc: "Every file in the project and every command, to rebuild or re-run any step by hand.", ready: true }
          ]
        }
      ]
    },
    {
      id: "power-electronics",
      title: "Power Electronics",
      path: "power-electronics/index.html",
      tutorials: [
        {
          id: "pe-renewable",
          title: "Power Electronics for Renewable Energy",
          short: "PE for Renewables",
          path: "power-electronics/renewable-energy/",
          chapters: [
            { part: "Foundations", file: "01-big-picture.html", title: "The Big Picture", desc: "Why every solar panel, wind turbine and battery needs a power converter, the four kinds of conversion, and why converters switch instead of burning off voltage.", ready: true },
            { part: "Foundations", file: "02-semiconductor-switches.html", title: "Semiconductor Switches", desc: "Diodes, MOSFETs and IGBTs, the wide-bandgap devices SiC and GaN, conduction-loss models and how to read a datasheet.", ready: true },
            { part: "Foundations", file: "03-switching-and-losses.html", title: "Switching, PWM & Losses", desc: "PWM and duty cycle, what happens during a hard switching transition, every loss mechanism, dead time and thermal design.", ready: true },
            { part: "Converter Circuits", file: "04-dc-dc-converters.html", title: "DC-DC Converters", desc: "Buck, boost and buck-boost from volt-second balance: ripple equations, CCM and DCM, non-ideal gain and a PV boost design.", ready: true },
            { part: "Converter Circuits", file: "05-mppt.html", title: "Maximum Power Point Tracking", desc: "The PV curve, perturb-and-observe, incremental conductance and the sensing electronics behind them.", ready: true },
            { part: "Converter Circuits", file: "06-inverters.html", title: "Inverters", desc: "Half-bridge, H-bridge and three-phase bridges, sinusoidal and space-vector PWM, and dead-time distortion.", ready: true },
            { part: "Converter Circuits", file: "07-isolated-converters.html", title: "Isolated DC-DC Converters", desc: "Flyback, forward, full-bridge and LLC resonant converters, and when isolation is needed.", ready: true },
            { part: "Hardware Design", file: "08-gate-drivers.html", title: "Gate Drivers & Isolation", desc: "Driving MOSFETs, IGBTs, SiC and GaN: gate resistors, bootstrap and isolated drivers, Miller clamps and desaturation protection.", ready: true },
            { part: "Hardware Design", file: "09-magnetics.html", title: "Magnetics: Inductors & Transformers", desc: "Cores, saturation, winding losses and designing the inductor of a DC-DC converter.", ready: true },
            { part: "Hardware Design", file: "10-filters-emi-layout.html", title: "Filters, EMI & PCB Layout", desc: "Input and output filters, harmonics, conducted EMI, and the layout rules that keep a fast converter quiet.", ready: true },
            { part: "Hardware Design", file: "11-control-simulation.html", title: "Control & Simulation", desc: "Averaged models, voltage- and current-mode control loops, and simulating converters in Python.", ready: true },
            { part: "Hardware Design", file: "12-thermal-reliability-protection.html", title: "Thermal Design, Reliability & Protection", desc: "Heatsinks, component lifetime, overcurrent and overvoltage protection for twenty years outdoors.", ready: true },
            { part: "Appendix", file: "appendix-a-formulas.html", num: "A", title: "Formula Sheet", desc: "Every converter equation from the tutorial on one page.", ready: true }
          ]
        }
      ]
    },
    {
      id: "dba",
      title: "Proactive Database Administration",
      path: "dba/index.html",
      tutorials: [
        {
          id: "proactive-dba",
          title: "Proactive DBA",
          short: "Proactive DBA",
          path: "dba/proactive-dba/",
          chapters: [
            { part: "Engines", file: "01-sql-server.html", title: "Proactive SQL Server Administration", desc: "Backups, corruption, space, waits, Query Store regressions, blocking, statistics, security drift, defragmentation and reclaiming space, rolled into one daily health check with alerts.", ready: true },
            { part: "Engines", file: "02-redshift.html", title: "Proactive Amazon Redshift Administration", desc: "Table health, vacuum and analyze, queueing, WLM query monitoring rules, disk spills, locks, load errors, Advisor, re-sorting with VACUUM and deep copy, and reclaiming storage, on provisioned clusters and Serverless.", ready: true }
          ]
        }
      ]
    },
    {
      id: "uv",
      title: "uv: Python Projects and Packaging",
      path: "uv/index.html",
      tutorials: [
        {
          id: "uv-hands-on",
          title: "uv Hands-On: From First Script to Production",
          short: "uv Hands-On",
          path: "uv/hands-on/",
          chapters: [
            { part: "Beginner", file: "01-why-uv.html", title: "Why uv", desc: "The Python packaging problem, the tools uv replaces, and the mental model you will use for the rest of the tutorial.", ready: true },
            { part: "Beginner", file: "02-install.html", title: "Installing uv and First Commands", desc: "Install uv on Windows, macOS and Linux, check it works, update it and run your first Python code with it.", ready: true },
            { part: "Beginner", file: "03-python-versions.html", title: "Managing Python Versions", desc: "Install, list, pin and find Python interpreters, and how uv decides which Python a command uses.", ready: true },
            { part: "Beginner", file: "04-scripts.html", title: "Scripts with Inline Dependencies", desc: "Run single-file scripts with their own dependencies, declared inside the file, with no virtual environment to manage.", ready: true },
            { part: "Intermediate", file: "05-projects.html", title: "Your First Project", desc: "uv init, pyproject.toml, uv add, uv run and the .venv folder: building a small command-line app step by step.", ready: true },
            { part: "Intermediate", file: "06-dependencies.html", title: "Dependencies in Depth", desc: "Version specifiers, development and optional groups, git and path sources, private indexes and upgrading safely.", ready: true },
            { part: "Intermediate", file: "07-lockfile-sync.html", title: "The Lockfile and Sync", desc: "What uv.lock contains, universal resolution, uv lock and uv sync, --locked and --frozen, and exporting requirements.", ready: true },
            { part: "Intermediate", file: "08-tools.html", title: "Command-Line Tools with uvx", desc: "Run tools such as Ruff and pytest without installing them, or install them once, each in its own environment.", ready: true },
            { part: "Intermediate", file: "09-pip-interface.html", title: "The pip Interface and Migration", desc: "uv venv and uv pip as a fast drop-in for pip and pip-tools, and moving requirements.txt and Poetry projects to uv.", ready: true },
            { part: "Advanced", file: "10-workspaces-packaging.html", title: "Workspaces, Building and Publishing", desc: "Several packages in one repository with one lockfile, build backends, uv build and uv publish.", ready: true },
            { part: "Advanced", file: "11-docker-ci.html", title: "uv in Docker and CI/CD", desc: "Small, cache-friendly Docker images with multi-stage builds, and fast, reproducible GitHub Actions pipelines.", ready: true },
            { part: "Advanced", file: "12-internals.html", title: "Internals, Configuration and Troubleshooting", desc: "The global cache and link modes, the resolver, configuration files and environment variables, and fixing common errors.", ready: true }
          ]
        }
      ]
    },
    {
      id: "ai-logistics",
      title: "AI for Logistics and Transportation",
      path: "ai-logistics/index.html",
      tutorials: [
        {
          id: "ai-logistics-playbook",
          title: "AI Use Cases for Logistics and Transportation: The Transformation Playbook",
          short: "AI in Logistics Playbook",
          path: "ai-logistics/playbook/",
          chapters: [
            { part: "Foundations", file: "01-why-ai-changes-logistics.html", title: "Why AI Changes Logistics", desc: "Digital operating models, scale, scope and learning, and why logistics is where AI meets the physical world.", ready: true },
            { part: "Foundations", file: "02-logistics-ai-factory.html", title: "The Logistics AI Factory", desc: "Data pipeline, algorithms, experimentation and infrastructure: the decision engine behind every use case.", ready: true },
            { part: "Foundations", file: "03-rearchitecting-the-firm.html", title: "Rearchitecting the Logistics Firm", desc: "From TMS, WMS and ERP silos to one data platform with clear interfaces, and what that means for managers.", ready: true },
            { part: "Use cases", file: "04-planning-forecasting.html", title: "Planning, Forecasting and Visibility", desc: "Demand and volume forecasting, capacity planning, network design, inventory positioning and ETA prediction.", ready: true },
            { part: "Use cases", file: "05-transport-fleet.html", title: "Transportation and Fleet", desc: "Route optimisation, dynamic dispatch, load building, predictive maintenance, fuel, safety and autonomy.", ready: true },
            { part: "Use cases", file: "06-warehouse-fulfilment.html", title: "Warehouse and Fulfilment", desc: "Slotting, pick paths, labour planning, robotics orchestration and computer vision in the distribution centre.", ready: true },
            { part: "Use cases", file: "07-freight-commercial-backoffice.html", title: "Freight, Commercial and Back Office", desc: "Pricing and quoting, email-to-order automation, customs documents, freight audit, claims and AI agents.", ready: true },
            { part: "Transformation", file: "08-portfolio-strategy.html", title: "Choosing the Use-Case Portfolio", desc: "Scoring and sequencing use cases, and network strategy: learning effects, clustering, multihoming and bridging.", ready: true },
            { part: "Transformation", file: "09-transformation-roadmap.html", title: "The Transformation Roadmap", desc: "Four maturity stages, five principles, the operating model, roles, KPIs and a 12-month plan.", ready: true },
            { part: "Transformation", file: "10-governance-leadership.html", title: "Governance, Risk and Leadership", desc: "Bias, safety, cybersecurity, driver data, controls for AI agents, regulation and the leadership mandate.", ready: true }
          ]
        }
      ]
    },
    {
      id: "linux",
      title: "Linux Administration",
      path: "linux/index.html",
      tutorials: [
        {
          id: "ubuntu-cli",
          title: "Ubuntu Command-Line Cheat Sheet",
          short: "Ubuntu CLI Cheat Sheet",
          path: "linux/ubuntu-cli/",
          chapters: [
            { part: "Reference", file: "01-cheat-sheet.html", title: "The Ubuntu Command-Line Cheat Sheet", desc: "System information, processes, services and logs, cron, files and permissions, packages, networking, the firewall, SSH, users, LXD and Ubuntu Pro, with explanations and one-click copy.", ready: true }
          ]
        }
      ]
    }
  ]
};
