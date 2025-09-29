export const TEMPLATE_KINDS = {
    asset: {
        templatesTable: 'asset_templates',
        fieldsTable: 'template_properties',
        relation: 'assets',       // used for count aggregate
        countAlias: 'assetCount',
    },
    log: {
        templatesTable: 'log_templates',
        fieldsTable: 'log_template_fields',
        relation: 'log_entries',
        countAlias: 'logCount',
    },
};