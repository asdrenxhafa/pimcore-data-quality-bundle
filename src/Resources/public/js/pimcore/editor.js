pimcore.registerNS("valantic.dataquality.editor");
valantic.dataquality.editor = Class.create({

    initialize: function (element, type) {
        var tabPanel = Ext.getCmp("pimcore_panel_tabs");
        tabPanel.add(this.getLayout());
        tabPanel.setActiveTab(this.getLayout());

        this.getLayout().on("destroy", function () {
            pimcore.globalmanager.remove("valantic_dataquality_editor");
        });

        pimcore.layout.refresh();
    },

    activate: function () {
        var tabPanel = Ext.getCmp("pimcore_panel_tabs");
        tabPanel.activate(this.getLayout());
    },

    getLayout: function () {

        if (this.layout == null) {

            var itemsPerPage = pimcore.helpers.grid.getDefaultPageSize();
            this.store = pimcore.helpers.grid.buildDefaultStore(
                Routing.generate('valantic_dataquality_config_list'),
                ['classname', 'attribute', 'rules'],
                itemsPerPage,
                {
                    autoLoad: true,
                    remoteFilter: false,
                    sorters: [
                        {
                            property: 'classname',
                            direction: 'ASC'
                        },
                        {
                            property: 'attributename',
                            direction: 'ASC',
                        },
                    ]
                }
            );

            this.filterField = new Ext.form.TextField({
                xtype: "textfield",
                width: 200,
                style: "margin: 0 10px 0 0;",
                enableKeyEvents: true,
                listeners: {
                    "keydown": function (field, key) {
                        if (key.getKey() == key.ENTER) {
                            // TODO: missing server-side
                            var input = field;
                            var proxy = this.store.getProxy();
                            proxy.extraParams.filterText = input.getValue();

                            this.store.load();
                        }
                    }.bind(this)
                }
            });

            this.pagingtoolbar = pimcore.helpers.grid.buildDefaultPagingToolbar(this.store);


            var tbarItems = [
                {
                    text: t('add'),
                    handler: this.onAddMain.bind(this),
                    iconCls: "pimcore_icon_add"
                },
                "->",
                {
                    text: t("filter") + "/" + t("search"),
                    xtype: "tbtext",
                    style: "margin: 0 10px 0 0;"
                },
                this.filterField
            ];

            var tbar = Ext.create('Ext.Toolbar', {
                cls: 'pimcore_main_toolbar',
                items: tbarItems
            });

            var columns = [
                {text: "ID", sortable: true, dataIndex: 'id', hidden: true, filter: 'numeric', flex: 60},
                {
                    text: t('valantic_dataquality_config_column_classname'),
                    sortable: true,
                    dataIndex: 'classname',
                    filter: 'string',
                    flex: 200,
                    renderer: Ext.util.Format.htmlEncode
                },
                {
                    text: t('valantic_dataquality_config_column_attributename'),
                    sortable: true,
                    dataIndex: 'attributename',
                    filter: 'string',
                    flex: 200,
                    renderer: Ext.util.Format.htmlEncode
                },
            ];

            var plugins = ['pimcore.gridfilters'];

            this.grid = new Ext.grid.GridPanel({
                store: this.store,
                region: "center",
                columns: columns,
                columnLines: true,
                bbar: this.pagingtoolbar,
                tbar: tbar,
                autoExpandColumn: "description",
                stripeRows: true,
                autoScroll: true,
                plugins: plugins,
                viewConfig: {
                    forceFit: true
                },
                listeners: {
                    rowclick: function (grid, record, tr, rowIndex, e, eOpts) {
                        this.showDetail(rowIndex);
                    }.bind(this),
                    cellcontextmenu: this.onMainContextmenu.bind(this),
                }
            });

            this.detailView = new Ext.Panel({
                region: "east",
                minWidth: 350,
                width: 350,
                split: true,
                layout: "fit"
            });

            var layoutConf = {
                tabConfig: {
                    tooltip: t('valantic_dataquality_config_tooltip')
                },
                iconCls: "pimcore_nav_icon_object",
                items: [this.grid, this.detailView],
                layout: "border",
            };

            layoutConf["title"] = t('valantic_dataquality_config_tooltip');

            this.layout = new Ext.Panel(layoutConf);

            this.layout.on("activate", function () {
                this.store.load();
            }.bind(this));
        }

        return this.layout;
    },

    onMainContextmenu: function (tree, td, cellIndex, record, tr, rowIndex, e, eOpts) {
        var rec = this.store.getAt(rowIndex);

        var menu = new Ext.menu.Menu();
        menu.add([{
            text: t("delete"),
            iconCls: "pimcore_icon_delete",
            handler: function () {
                Ext.Ajax.request({
                    url: Routing.generate('valantic_dataquality_config_delete'),
                    method: "delete",
                    params: {
                        classname: rec.get('classname'),
                        attributename: rec.get('attributename'),
                    },
                    success: function (response, opts) {
                        this.store.reload();
                    }.bind(this),
                });

            }.bind(this)
        }]);

        e.stopEvent();
        menu.showAt(e.pageX, e.pageY);
    },

    showDetail: function (rowIndex) {
        var rec = this.store.getAt(rowIndex);
        this.record = rec;

        var keyValueStore = new Ext.data.Store({
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    rootProperty: 'rules'
                }
            },
            autoDestroy: true,
            data: rec.data,
            fields: ['constraint', 'args']
        });

        var keyValueGrid = new Ext.grid.GridPanel({
            store: keyValueStore,
            title: t("valantic_dataquality_config_details_for") + ' ' + rec.get('classname') + '.' + rec.get('attributename'),
            columns: [
                {
                    text: t("valantic_dataquality_config_column_constraint"),
                    sortable: true,
                    dataIndex: 'constraint',
                    flex: 60
                },
                {
                    text: t("valantic_dataquality_config_column_parameters"),
                    sortable: true,
                    dataIndex: 'args',
                    flex: 30,
                    renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                        return value ? JSON.stringify(value) : '';
                    }
                },
            ],
            columnLines: true,
            stripeRows: true,
            autoScroll: true,
            viewConfig: {
                forceFit: true
            }
        });


        var detailTbar = Ext.create('Ext.Toolbar', {
            cls: 'pimcore_main_toolbar',
            items: [
                {
                    text: t('add'),
                    handler: this.onAddDetail.bind(this),
                    iconCls: "pimcore_icon_add"
                }
            ]
        });

        this.detailView.removeAll();
        if (this.detailView.getDockedItems().length === 0) {
            this.detailView.addDocked(detailTbar);
        }
        this.detailView.add(keyValueGrid);
        this.detailView.updateLayout();
    },

    onAddMain: function () {
        var classesStore = new Ext.data.Store({
            fields: ["name"],
            proxy: {
                type: 'ajax',
                url: Routing.generate('valantic_dataquality_config_classes'),
                reader: {
                    type: 'json',
                    rootProperty: 'classes'
                }
            }
        });

        var attributesStore = new Ext.data.Store({
            fields: ["name"],
            proxy: {
                type: 'ajax',
                url: Routing.generate('valantic_dataquality_config_attributes'),
                extraParams: {
                    classname: ''
                },
                reader: {
                    type: 'json',
                    rootProperty: 'attributes'
                }
            }
        });

        var classnameCombo = {
            xtype: "combo",
            fieldLabel: t('valantic_dataquality_config_column_classname'),
            name: "classname",
            editable: true,
            displayField: 'name',
            valueField: 'name',
            store: classesStore,
            mode: "local",
            triggerAction: "all",
            width: 250,
            listeners: {
                'select': function (combo, value, index) {
                    var classname = combo.getValue();
                    attributesStore.getProxy().setExtraParams({
                        classname: classname
                    });
                    attributesStore.load();
                    attributenameCombo.clearValue();
                }
            }
        };

        var attributenameCombo = new Ext.form.field.ComboBox({
            xtype: "combo",
            fieldLabel: t('valantic_dataquality_config_column_attributename'),
            name: "attributename",
            editable: true,
            displayField: 'name',
            valueField: 'name',
            store: attributesStore,
            mode: "local",
            triggerAction: "all",
            width: 250
        });

        var formPanel = new Ext.form.FormPanel({
            bodyStyle: "padding:10px;",
            items: [classnameCombo, attributenameCombo]
        });

        var addMainWin = new Ext.Window({
            modal: true,
            width: 300,
            height: 200,
            closable: true,
            items: [formPanel],
            buttons: [{
                text: t("save"),
                iconCls: "pimcore_icon_accept",
                handler: function () {
                    var values = formPanel.getForm().getFieldValues();

                    Ext.Ajax.request({
                        url: Routing.generate('valantic_dataquality_config_add'),
                        method: "post",
                        params: values,
                        success: function (response, opts) {
                            this.store.reload();
                        }.bind(this),
                    });

                    addMainWin.close();
                }.bind(this)
            }]
        });

        addMainWin.show();
    },
    onAddDetail: function () {
        var constraintsStore = new Ext.data.Store({
            fields: ["name"],
            proxy: {
                type: 'ajax',
                url: Routing.generate('valantic_dataquality_config_constraints'),
                reader: {
                    type: 'json',
                    rootProperty: 'constraints'
                }
            }
        });

        var formPanel = new Ext.form.FormPanel({
            bodyStyle: "padding:10px;",
            items: [
                {
                    xtype: "combo",
                    fieldLabel: t('valantic_dataquality_config_column_constraint'),
                    name: "constraint",
                    editable: true,
                    displayField: 'name',
                    valueField: 'name',
                    store: constraintsStore,
                    mode: "local",
                    triggerAction: "all",
                    width: 400,
                },
                {
                    xtype: "textareafield",
                    fieldLabel: t('valantic_dataquality_config_column_parameters'),
                    name: "params",
                    editable: true,
                    width: 400,
                    height: 200,
                }
            ]
        });

        var addDetailWin = new Ext.Window({
            modal: true,
            width: 450,
            height: 350,
            closable: true,
            items: [formPanel],
            buttons: [{
                text: t("save"),
                iconCls: "pimcore_icon_accept",
                handler: function () {
                    var values = formPanel.getForm().getFieldValues();
                    Ext.Ajax.request({
                        url: Routing.generate('valantic_dataquality_config_addconstraint'),
                        method: "post",
                        params: {
                            ...values,
                            classname: this.record.get('classname'),
                            attributename: this.record.get('attributename'),
                        },
                        success: function (response, opts) {
                            this.store.reload(); // FIXME detailView not updated
                            this.detailView.updateLayout();
                        }.bind(this),
                    });

                    addDetailWin.close();
                }.bind(this)
            }]
        });

        addDetailWin.show();
    },
});
