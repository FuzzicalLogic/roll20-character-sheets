on("sheet:opened", function (eventinfo) {
    versioning(function () {
        var getInfo = function (sections, callback, results) {
            results = results || {};
            if (sections.length > 0) {
                var section = sections.pop();
                getSectionIDs(section, function (ids) {
                    results[section] = ids;
                    getInfo(sections, callback, results);
                });
            } else {
                callback(results);
            }
        }
        var spellSections = ["spell-cantrip"];
        for (var x = 1; x <= 9; x++) {
            spellSections.push("spell-" + x);
        }

        getInfo(spellSections, function (results) {
            var getList = ["character_id"];
            _.each(results, function (sectionids, sectionname) {
                _.each(sectionids, function (spellid) {
                    getList.push("repeating_" + sectionname + "_" + spellid + "_rollcontent");
                });
            });
            getAttrs(getList, function (attrs) {
                var set = {};
                _.each(attrs, function (data, name) {
                    if (data.length === 68 && data.split("|")[0].substr(2) !== attrs["character_id"]) {
                        set[name] = "%{" + attrs["character_id"] + data.substr(22);
                    }
                });
                setAttrs(set, function () {
                    if (eventinfo.sourceType === "sheetworker") {
                        setAttrs({ l1mancer_status: "completed" })
                    }
                    else {
                        check_l1_mancer();
                        check_lp_mancer();
                    };
                });
            });
        });
    });
});

//Start of Compendium Drops
on("sheet:compendium-drop", function () {
    getAttrs(["hp_max", "npc_senses", "token_size", "cd_bar1_v", "cd_bar1_m", "cd_bar1_l", "cd_bar2_v", "cd_bar2_m", "cd_bar2_l", "cd_bar3_v", "cd_bar3_m", "cd_bar3_l"], function (v) {

        var default_attr = {};
        default_attr["width"] = 70;
        default_attr["height"] = 70;
        if (v["npc_senses"].toLowerCase().match(/(darkvision|blindsight|tremorsense|truesight)/)) {
            default_attr["light_radius"] = Math.max.apply(Math, v["npc_senses"].match(/\d+/g));
        }
        if (v["token_size"]) {
            var squarelength = 70;
            if (v["token_size"].toString().indexOf(",") > -1) {
                var setwidth = !isNaN(v["token_size"].split(",")[0]) ? v["token_size"].split(",")[0] : 1;
                var setheight = !isNaN(v["token_size"].split(",")[1]) ? v["token_size"].split(",")[1] : 1;
                default_attr["width"] = setwidth * squarelength;
                default_attr["height"] = setheight * squarelength;
            }
            else {
                default_attr["width"] = squarelength * v["token_size"]
                default_attr["height"] = squarelength * v["token_size"]
            };
        }

        var getList = {};
        for (x = 1; x <= 3; x++) {
            _.each(["v", "m"], function (letter) {
                var keyname = "cd_bar" + x + "_" + letter;
                if (v[keyname] != undefined && isNaN(v[keyname])) {
                    getList[keyname] = v[keyname];
                }
            });
        }

        getAttrs(_.values(getList), function (values) {
            _.each(_.keys(getList), function (keyname) {
                v[keyname] = values[getList[keyname]] == undefined ? "" : values[getList[keyname]];
            });

            if (v["cd_bar1_l"]) {
                default_attr["bar1_link"] = v["cd_bar1_l"];
            }
            else if (v["cd_bar1_v"] || v["cd_bar1_m"]) {
                if (v["cd_bar1_v"]) {
                    default_attr["bar1_value"] = v["cd_bar1_v"];
                }
                if (v["cd_bar1_m"]) {
                    default_attr["bar1_max"] = v["cd_bar1_m"];
                }
            }
            else {
                default_attr["bar1_value"] = v["hp_max"];
                default_attr["bar1_max"] = v["hp_max"];
            }

            if (v["cd_bar2_l"]) {
                default_attr["bar2_link"] = v["cd_bar2_l"];
            }
            else if (v["cd_bar2_v"] || v["cd_bar2_m"]) {
                if (v["cd_bar2_v"]) {
                    default_attr["bar2_value"] = v["cd_bar2_v"];
                }
                if (v["cd_bar2_m"]) {
                    default_attr["bar2_max"] = v["cd_bar2_m"];
                }
            }
            else {
                default_attr["bar2_link"] = "npc_ac";
            }

            if (v["cd_bar3_l"]) {
                default_attr["bar3_link"] = v["cd_bar3_l"];
            }
            else if (v["cd_bar3_v"] || v["cd_bar3_m"]) {
                if (v["cd_bar3_v"]) {
                    default_attr["bar3_value"] = v["cd_bar3_v"];
                }
                if (v["cd_bar3_m"]) {
                    default_attr["bar3_max"] = v["cd_bar3_m"];
                }
            }

            setDefaultToken(default_attr);
        });
    });
});

['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(attr => {
    on(`change:${attr}_base change:${attr}_bonus`, function () {
        update_attr(`${attr}`);

    });
});

['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(attr => {
    on(`change:${attr}`, function () {
        update_mod(`${attr}`);

        const cap = attr.charAt(0).toUpperCase() + attr.slice(1);
        check_customac(cap);

        (attr === "strength") ? update_weight() : false;
        (attr === "dexterity") ? update_initiative() : false;
    });
});

['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(attr => {
    on(`change:${attr}_mod`, function () {
        update_save(`${attr}`);
        update_attacks(`${attr}`);
        update_tool(`${attr}`);
        update_spell_info(`${attr}`);

        switch (`${attr}`) {
            case "strength":
                update_skills(["athletics"]);
                break;
            case "dexterity":
                update_skills(["acrobatics", "sleight_of_hand", "stealth"]);
                update_ac();
                update_initiative();
                break;
            case "intelligence":
                update_skills(["arcana", "history", "investigation", "nature", "religion"]);
                break;
            case "wisdom":
                update_skills(["animal_handling", "insight", "medicine", "perception", "survival"]);
                break;
            case "charisma":
                update_skills(["deception", "intimidation", "performance", "persuasion"]);
                break;
            default:
                false;
        }
    });
});

['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(attr => {
    on(`change:${attr}_save_prof change:${attr}_save_mod`, function (eventinfo) {
        if (eventinfo.sourceType === "sheetworker") { return; };
        update_save(`${attr}`);
    });
});

on("change:globalsavemod", function (eventinfo) {
    if (eventinfo.sourceType === "sheetworker") { return; };
    update_all_saves();
});

on("change:death_save_mod", function (eventinfo) {
    if (eventinfo.sourceType === "sheetworker") { return; };
    update_save("death");
});

['acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation',
    'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'].forEach(attr => {
        on(`change:${attr}_prof change:${attr}_type change:${attr}_flat`, function (eventinfo) {
            if (eventinfo.sourceType === "sheetworker") { return; };
            update_skills([`${attr}`]);
        });
    });

on("change:repeating_tool:toolname change:repeating_tool:toolbonus_base change:repeating_tool:toolattr_base change:repeating_tool:tool_mod", function (eventinfo) {
    if (eventinfo.sourceType === "sheetworker") {
        return;
    }
    var tool_id = eventinfo.sourceAttribute.substring(15, 35);
    update_tool(tool_id);
});

on("change:repeating_attack:atkname change:repeating_attack:atkflag change:repeating_attack:atkattr_base change:repeating_attack:atkmod change:repeating_attack:atkmagic change:repeating_attack:atkprofflag change:repeating_attack:dmgflag change:repeating_attack:dmgbase change:repeating_attack:dmgattr change:repeating_attack:dmgmod change:repeating_attack:dmgtype change:repeating_attack:dmg2flag change:repeating_attack:dmg2base change:repeating_attack:dmg2attr change:repeating_attack:dmg2mod change:repeating_attack:dmg2type change:repeating_attack:saveflag change:repeating_attack:savedc change:repeating_attack:saveflat change:repeating_attack:dmgcustcrit change:repeating_attack:dmg2custcrit change:repeating_attack:ammo change:repeating_attack:saveattr change:repeating_attack:atkrange", function (eventinfo) {
    if (eventinfo.sourceType === "sheetworker") {
        return;
    }

    var source = eventinfo.sourceAttribute.substr(38);
    var attackid = eventinfo.sourceAttribute.substring(17, 37);
    if (source == "atkattr_base" || source == "savedc") {
        getAttrs(["repeating_attack_spellid", "repeating_attack_spelllevel"], function (v) {
            set = {};
            if (v.repeating_attack_spellid && v.repeating_attack_spellid != "" && v.repeating_attack_spelllevel && v.repeating_attack_spelllevel != "") {
                var newVal = eventinfo.newValue == "spell" ? "spell" : _.last(eventinfo.newValue.split("_")[0].split("{"));
                set["repeating_attack_atkattr_base"] = newVal == "spell" ? "spell" : "@{" + newVal + "_mod}";
                set["repeating_attack_savedc"] = newVal == "spell" ? "spell" : "(@{" + newVal + "_mod}+8+@{pb})";
                set["repeating_spell-" + v.repeating_attack_spelllevel + "_" + v.repeating_attack_spellid + "_spell_ability"] = newVal == "spell" ? "spell" : "@{" + newVal + "_mod}+";
            }
            setAttrs(set, function () {
                update_attacks(attackid);
            });
        });
    } else {
        update_attacks(attackid);
    }
});

on("change:repeating_damagemod remove:repeating_damagemod", function (eventinfo) {
    update_globaldamage();
});

on("change:global_damage_mod_flag", function (eventinfo) {
    getSectionIDs("damagemod", function (ids) {
        var update = {};
        if (eventinfo.newValue === "1") {
            if (!ids || ids.length === 0) {
                var rowid = generateRowID();
                update[`repeating_damagemod_${rowid}_global_damage_active_flag`] = "1";
            }
        } else {
            _.each(ids, function (rowid) {
                update[`repeating_damagemod_${rowid}_global_damage_active_flag`] = "0";
            });
        }
        setAttrs(update);
    });
});

on("change:exhaustion_toggle", function (eventinfo) {
    if (eventinfo.newValue !== "0") {
        getAttrs(["exhaustion_level"], function (attrs) {
            if (!attrs.exhaustion_level || attrs.exhaustion_level === "") {
                var update = {};
                update.exhaustion_level = "0";
                setAttrs(update);
            }
        });
    }
});

on("change:exhaustion_level", function (eventinfo) {
    const newValue = parseInt(eventinfo.newValue) || 0, previousValue = parseInt(eventinfo.previousValue) || 0;
    let update = {};

    if (newValue === 0) {
        //If exhaustion is 0 the reset exhaustion_1 to "No Effect" and blank the other spans
        for (let i = 2; i <= 6; i++) { update[`exhaustion_${i}`] = "" }
        update[`exhaustion_1`] = "� " + getTranslationByKey(`exhaustion-0`)
    } else if (newValue > previousValue) {
        //If exhaustion increase then add text to the spans
        for (let i = previousValue; i <= newValue; i++) { update[`exhaustion_${i}`] = "� " + getTranslationByKey(`exhaustion-${i}`) }
    } else {
        //If exhaustion decrease remove text from spans
        for (let i = newValue + 1; i <= previousValue; i++) { update[`exhaustion_${i}`] = "" }
    };

    setAttrs(update, { silent: true });
});

on("change:race change:subrace", function (eventinfo) {
    update_race_display();
});

on("change:drop_category", function (eventinfo) {
    if (eventinfo.newValue === "Monsters") {
        getAttrs(["class", "race", "speed", "hp"], function (v) {
            if (v["class"] != "" || v["race"] != "" || v["speed"] != "" || v["hp"] != "") {
                setAttrs({ monster_confirm_flag: 1 });
            }
            else {
                handle_drop(eventinfo.newValue);
            }
        });
    }
    else {
        handle_drop(eventinfo.newValue);
    }
});

on(`change:repeating_inventory:hasattack`, function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") { return; };

    const itemid = eventinfo.sourceAttribute.substring(20, 40);
    getAttrs([`repeating_inventory_${itemid}_itemattackid`], function (v) {
        const hasattack = eventinfo.newValue, itemattackid = v[`repeating_inventory_${itemid}_itemattackid`];
        (hasattack == 1) ? create_attack_from_item(itemid) : remove_attack(itemattackid);
    });
});

on(`change:repeating_inventory:useasresource`, function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") { return; };

    const itemid = eventinfo.sourceAttribute.substring(20, 40);
    getAttrs([`repeating_inventory_${itemid}_itemresourceid`], function (v) {
        const useasresource = eventinfo.newValue, itemresourceid = v[`repeating_inventory_${itemid}_itemresourceid`];
        (useasresource == 1) ? create_resource_from_item(itemid) : remove_resource(itemresourceid);
    });
});

on("change:repeating_inventory:itemname change:repeating_inventory:itemproperties change:repeating_inventory:itemmodifiers change:repeating_inventory:itemcount", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }

    var itemid = eventinfo.sourceAttribute.substring(20, 40);
    getAttrs(["repeating_inventory_" + itemid + "_itemattackid", "repeating_inventory_" + itemid + "_itemresourceid"], function (v) {
        var attackid = v["repeating_inventory_" + itemid + "_itemattackid"];
        var resourceid = v["repeating_inventory_" + itemid + "_itemresourceid"];
        if (attackid) {
            update_attack_from_item(itemid, attackid);
        }
        if (resourceid) {
            update_resource_from_item(itemid, resourceid);
        }
    });
});

['other_resource', 'repeating_resource:resource_left', 'repeating_resource:resource_right'].forEach(attr => {
    on(`change:${attr} change:${attr}_name`, (eventinfo) => {
        if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") { return; }
        const resourceid = (eventinfo.sourceAttribute.includes("_name")) ? eventinfo.sourceAttribute.slice(0, -5) : eventinfo.sourceAttribute;
        getAttrs([`${resourceid}_itemid`], (v) => {
            const value = eventinfo.newValue;
            //Update repeating_inventory if an itemid is associated with a resource
            if (v[`${resourceid}_itemid`] && v[`${resourceid}_itemid`] != "") {
                const itemid = v[`${resourceid}_itemid`];
                let update = {};
                if (eventinfo.sourceAttribute.includes("_name")) {
                    update[`repeating_inventory_${itemid}_itemname`] = eventinfo.newValue;
                } else {
                    update[`repeating_inventory_${itemid}_itemcount`] = eventinfo.newValue;
                };
                setAttrs(update, { silent: true }, () => { update_weight() });
            };
        });
    });
});

on("change:repeating_inventory:itemweight change:repeating_inventory:itemcount change:cp change:sp change:ep change:gp change:pp change:encumberance_setting change:size change:carrying_capacity_mod", function () {
    update_weight();
});

on("change:repeating_inventory:itemmodifiers change:repeating_inventory:equipped", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    var itemid = eventinfo.sourceAttribute.substring(20, 40);
    getAttrs(["repeating_inventory_" + itemid + "_itemmodifiers"], function (v) {
        if (v["repeating_inventory_" + itemid + "_itemmodifiers"]) {
            check_itemmodifiers(v["repeating_inventory_" + itemid + "_itemmodifiers"], eventinfo.previousValue);
        };
    });
});

on("change:custom_ac_flag change:custom_ac_base change:custom_ac_part1 change:custom_ac_part2 change:custom_ac_shield", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    update_ac();
});

['spell-cantrip', 'spell-1', 'spell-2', 'spell-3', 'spell-4', 'spell-5', 'spell-6', 'spell-7', 'spell-8', 'spell-9'].forEach(attr => {
    on(`change:repeating_${attr}:includedesc change:repeating_${attr}:innate change:repeating_${attr}:spell_ability change:repeating_${attr}:spell_updateflag change:repeating_${attr}:spellathigherlevels change:repeating_${attr}:spellattack change:repeating_${attr}:spelldamage change:repeating_${attr}:spelldamage2 change:repeating_${attr}:spelldamagetype change:repeating_${attr}:spelldamagetype2 change:repeating_${attr}:spelldescription change:repeating_${attr}:spelldmgmod change:repeating_${attr}:spellhealing change:repeating_${attr}:spellhlbonus change:repeating_${attr}:spellhldie change:repeating_${attr}:spellhldietype change:repeating_${attr}:spellname change:repeating_${attr}:spellprepared change:repeating_${attr}:spellrange change:repeating_${attr}:spellsave change:repeating_${attr}:spellsavesuccess change:repeating_${attr}:spelltarget change:repeating_${attr}:spell_damage_progression`, (eventinfo) => {
        if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") { return; }

        const spellid = eventinfo.sourceAttribute.split("_")[2], repeating_source = `repeating_${attr}_${spellid}`;
        getAttrs([`${repeating_source}_spellattackid`], (v) => {
            var attackid = v[`${repeating_source}_spellattackid`];
            var lvl = attr.split("spell-")[1];
            if (attackid && lvl && spellid) {
                update_attack_from_spell(lvl, spellid, attackid)
            }
        });
    });
});

['spell-cantrip', 'spell-1', 'spell-2', 'spell-3', 'spell-4', 'spell-5', 'spell-6', 'spell-7', 'spell-8', 'spell-9'].forEach(attr => {
    on(`change:repeating_${attr}:spelloutput`, (eventinfo) => {
        if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") { return; }

        const spellid = eventinfo.sourceAttribute.split("_")[2], repeating_source = `repeating_${attr}_${spellid}`;
        getAttrs([`${repeating_source}_spellattackid`, `${repeating_source}_spelllevel`, `${repeating_source}_spellathigherlevels`, "character_id"], function (v) {
            const attackid = v[repeating_source + "_spellattackid"];
            const higherlevels = v[repeating_source + "_spellathigherlevels"];
            const spelloutput = eventinfo.newValue;
            let lvl = v[repeating_source + "_spelllevel"];

            if (spelloutput && spelloutput === "ATTACK") {
                create_attack_from_spell(lvl, spellid, v["character_id"]);
            } else if (spelloutput && spelloutput === "SPELLCARD" && attackid && attackid != "") {
                let lvl = parseInt(v[repeating_source + "_spelllevel"], 10);
                remove_attack(attackid);
                update_spelloutput(higherlevels, lvl, repeating_source, spelloutput, licensedsheet);
            }
        });
    });
});

['spell-cantrip', 'spell-1', 'spell-2', 'spell-3', 'spell-4', 'spell-5', 'spell-6', 'spell-7', 'spell-8', 'spell-9'].forEach(attr => {
    on(`change:repeating_${attr}:spellathigherlevels`, (eventinfo) => {
        if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") { return; }

        const spellid = eventinfo.sourceAttribute.split("_")[2], repeating_source = `repeating_${attr}_${spellid}`;
        getAttrs([`${repeating_source}_spelllevel`, `${repeating_source}_spelloutput`], function (v) {
            const higherlevels = eventinfo.newValue;
            const lvl = parseInt(v[repeating_source + "_spelllevel"], 10);
            const spelloutput = v[repeating_source + "_spelloutput"];

            if (spelloutput && spelloutput === "SPELLCARD") {
                update_spelloutput(higherlevels, lvl, repeating_source, spelloutput, licensedsheet);
            }
        });
    });
});

const update_spelloutput = (higherlevels, lvl, repeating_source, spelloutput, licensedsheet) => {
    let spelllevel = "@{spelllevel}";
    let update = {};

    if (higherlevels) {
        for (i = 0; i < 10 - lvl; i++) {
            let tot = parseInt(i, 10) + parseInt(lvl, 10);
            spelllevel = spelllevel + "|Level " + tot + "," + tot;
        }
        spelllevel = `?{Cast at what level? ${spelllevel}}`;
    }
    update[repeating_source + "_rollcontent"] = `@{wtype}&{template: spell} {{ level=@{spellschool} ${spelllevel}}} {{ name=@{spellname}}} {{ castingtime=@{spellcastingtime}}} {{ range=@{spellrange}}} {{ target=@{spelltarget}}} @{spellcomp_v} @{spellcomp_s} @{spellcomp_m} {{ material=@{spellcomp_materials}}} {{ duration=@{spellduration}}} {{ description=@{spelldescription}}} {{ athigherlevels=@{spellathigherlevels}}} @{spellritual} {{ innate=@{innate}}} @{spellconcentration} @{charname_output} {{ licensedsheet=@{licensedsheet}}}`;
    setAttrs(update, { silent: true });
};

on("change:class change:custom_class change:cust_classname change:cust_hitdietype change:cust_spellcasting_ability change:cust_spellslots change:cust_strength_save_prof change:cust_dexterity_save_prof change:cust_constitution_save_prof change:cust_intelligence_save_prof change:cust_wisdom_save_prof change:cust_charisma_save_prof change:subclass change:multiclass1 change:multiclass1_subclass change:multiclass2 change:multiclass2_subclass change:multiclass3 change:multiclass3_subclass", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    update_class();
});

on("change:base_level change:multiclass1_flag change:multiclass1 change:multiclass1_lvl change:multiclass2_flag change:multiclass2 change:multiclass2_lvl change:multiclass3_flag change:multiclass3 change:multiclass3_lvl change:arcane_fighter change:arcane_rogue", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    set_level();
});

on("change:level_calculations change:caster_level change:lvl1_slots_mod change:lvl2_slots_mod change:lvl3_slots_mod change:lvl4_slots_mod change:lvl5_slots_mod change:lvl6_slots_mod change:lvl7_slots_mod change:lvl8_slots_mod change:lvl9_slots_mod", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    getAttrs(["level_calculations"], function (v) {
        if (!v["level_calculations"] || v["level_calculations"] == "on") {
            update_spell_slots();
        };
    });
});

on("change:caster_level", function (eventinfo) {
    getAttrs(["caster_level", "npc"], function (v) {
        var casterlvl = v["caster_level"] && !isNaN(parseInt(v["caster_level"], 10)) ? parseInt(v["caster_level"], 10) : 0;
        if (v["npc"] && v["npc"] == 1 && casterlvl > 0) {
            setAttrs({ level: casterlvl })
        };
    });
});

on("change:pb_type change:pb_custom", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    update_pb();
});

on("change:dtype", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    update_attacks("all");
    update_npc_action("all");
});

on("change:jack_of_all_trades", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    update_jack_attr();
    update_all_ability_checks();
});

on("change:initmod change:init_tiebreaker", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    update_initiative();
});

on("change:spellcasting_ability change:spell_dc_mod change:globalmagicmod", function (eventinfo) {
    if (eventinfo.sourceType && eventinfo.sourceType === "sheetworker") {
        return;
    }
    update_spell_info();
});

on("change:npc_challenge", function () {
    update_challenge();
});

on("change:npc_str_save_base change:npc_dex_save_base change:npc_con_save_base change:npc_int_save_base change:npc_wis_save_base change:npc_cha_save_base", function (eventinfo) {
    update_npc_saves();
});

on("change:npc_acrobatics_base change:npc_animal_handling_base change:npc_arcana_base change:npc_athletics_base change:npc_deception_base change:npc_history_base change:npc_insight_base change:npc_intimidation_base change:npc_investigation_base change:npc_medicine_base change:npc_nature_base change:npc_perception_base change:npc_performance_base change:npc_persuasion_base change:npc_religion_base change:npc_sleight_of_hand_base change:npc_stealth_base change:npc_survival_base", function (eventinfo) {
    update_npc_skills();
});

on("change:repeating_npcaction:attack_flag change:repeating_npcaction:attack_type change:repeating_npcaction:attack_range change:repeating_npcaction:attack_target change:repeating_npcaction:attack_tohit change:repeating_npcaction:attack_damage change:repeating_npcaction:attack_damagetype change:repeating_npcaction:attack_damage2 change:repeating_npcaction:attack_damagetype2 change:repeating_npcaction-l:attack_flag change:repeating_npcaction-l:attack_type change:repeating_npcaction-l:attack_range change:repeating_npcaction-l:attack_target change:repeating_npcaction-l:attack_tohit change:repeating_npcaction-l:attack_damage change:repeating_npcaction-l:attack_damagetype change:repeating_npcaction-l:attack_damage2 change:repeating_npcaction-l:attack_damagetype2 change:repeating_npcaction:show_desc change:repeating_npcaction-l:show_desc change:repeating_npcaction:description change:repeating_npcaction-l:description", function (eventinfo) {
    const actionid = eventinfo.sourceAttribute.split("_")[2];
    const legendary = eventinfo.sourceAttribute.includes("npcaction-l") ? true : false;

    update_npc_action(actionid, legendary);
});

on("change:core_die change:halflingluck_flag", function () {
    getAttrs(["core_die", "halflingluck_flag"], function (v) {
        core = v.core_die && v.core_die != "" ? v.core_die : "1d20";
        luck = v.halflingluck_flag && v.halflingluck_flag === "1" ? "ro<1" : "";
        update = {};
        update["d20"] = core + luck;
        if (!v.core_die || v.core_die === "") {
            update["core_die"] = "1d20";
        }
        setAttrs(update);
    });
});

[`ac`, `attack`, 'save', 'skill',].forEach(attr => {
    on(`change:global_${attr}_mod_flag`, (eventinfo) => {
        const mod = (attr === "attack") ? "tohitmod" : `${attr}mod`;
        if (eventinfo.newValue === "1") {
            const firstAttr = (attr === "ac") ? "val" : "roll";
            const firstAttrValue = (attr === "ac") ? 1 : "1d4";
            const secondAttrValue = (attr === "ac") ? "Defense" : (attr === "skill") ? "GUIDANCE" : "BLESS";

            getSectionIDs(mod, (ids) => {
                if (!ids || ids.length === 0) {
                    var update = {};
                    var rowid = generateRowID();
                    update[`repeating_${mod}_${rowid}_global_${attr}_${firstAttr}`] = `${firstAttrValue}`;
                    update[`repeating_${mod}_${rowid}_global_${attr}_name`] = `${secondAttrValue}`;
                    update[`repeating_${mod}_${rowid}_global_${attr}_active_flag`] = "1";
                    setAttrs(update);
                }
            });
        } else {
            getSectionIDs(mod, function (ids) {
                var update = {};
                var rowid = generateRowID();
                _.each(ids, function (rowid) {
                    update[`repeating_${mod}_${rowid}_global_${attr}_active_flag`] = "0";
                });
                setAttrs(update);
            });
        }
    });
});

on("change:repeating_skillmod remove:repeating_skillmod", function (eventinfo) {
    update_globalskills();
});

on("change:repeating_savemod remove:repeating_savemod", function (eventinfo) {
    update_globalsaves();
});

on("change:repeating_tohitmod remove:repeating_tohitmod", function (eventinfo) {
    update_globalattack();
});

on("change:repeating_acmod remove:repeating_acmod", function (eventinfo) {
    update_ac();
});

on("change:confirm", function (eventinfo) {
    setAttrs({ monster_confirm_flag: "" });
    getAttrs(["drop_category"], function (v) {
        if (v["drop_category"]) {
            handle_drop(v["drop_category"]);
        }
    });
});

on("change:cancel", function (eventinfo) {
    setAttrs({ monster_confirm_flag: "" });
    var update = {};
    update["drop_category"] = "";
    update["drop_name"] = "";
    update["drop_data"] = "";
    update["drop_content"] = "";
    setAttrs(update, { silent: true });
});

on("change:mancer_confirm", function (eventinfo) {
    setAttrs({ mancer_confirm_flag: "", charactermancer_step: "l1-welcome" }, function () {
        check_l1_mancer();
    });
});

on("change:mancer_cancel", function (eventinfo) {
    setAttrs({ mancer_confirm_flag: "", l1mancer_status: "completed" }, function () {
        check_l1_mancer();
    });
});

on("change:mancer_npc", function (eventinfo) {
    setAttrs({ mancer_confirm_flag: "", l1mancer_status: "completed", npc: "1" }, function () {
        check_l1_mancer();
    });
});

on("change:passiveperceptionmod", function (eventinfo) {
    update_passive_perception();
});

on("remove:repeating_inventory", function (eventinfo) {
    var itemid = eventinfo.sourceAttribute.substring(20, 40);
    var attackids = eventinfo.removedInfo && eventinfo.removedInfo["repeating_inventory_" + itemid + "_itemattackid"] ? eventinfo.removedInfo["repeating_inventory_" + itemid + "_itemattackid"] : undefined;
    var resourceid = eventinfo.removedInfo && eventinfo.removedInfo["repeating_inventory_" + itemid + "_itemresourceid"] ? eventinfo.removedInfo["repeating_inventory_" + itemid + "_itemresourceid"] : undefined;

    if (attackids) {
        _.each(attackids.split(","), function (value) { remove_attack(value); });
    }
    if (resourceid) {
        remove_resource(resourceid);
    }

    if (eventinfo.removedInfo && eventinfo.removedInfo["repeating_inventory_" + itemid + "_itemmodifiers"]) {
        check_itemmodifiers(eventinfo.removedInfo["repeating_inventory_" + itemid + "_itemmodifiers"]);
    }

    update_weight();
});

on("remove:repeating_attack", function (eventinfo) {
    var attackid = eventinfo.sourceAttribute.substring(17, 37);
    var itemid = eventinfo.removedInfo["repeating_attack_" + attackid + "_itemid"];
    var spellid = eventinfo.removedInfo["repeating_attack_" + attackid + "_spellid"];
    var spelllvl = eventinfo.removedInfo["repeating_attack_" + attackid + "_spelllevel"];
    if (itemid) {
        getAttrs(["repeating_inventory_" + itemid + "_hasattack"], function (v) {
            if (v["repeating_inventory_" + itemid + "_hasattack"] && v["repeating_inventory_" + itemid + "_hasattack"] == 1) {
                var update = {};
                update["repeating_inventory_" + itemid + "_itemattackid"] = "";
                update["repeating_inventory_" + itemid + "_hasattack"] = 0;
                setAttrs(update, { silent: true });
            }
        });
    };
    if (spellid && spelllvl) {
        getAttrs(["repeating_spell-" + spelllvl + "_" + spellid + "_spelloutput"], function (v) {
            if (v["repeating_spell-" + spelllvl + "_" + spellid + "_spelloutput"] && v["repeating_spell-" + spelllvl + "_" + spellid + "_spelloutput"] == "ATTACK") {
                var update = {};
                update["repeating_spell-" + spelllvl + "_" + spellid + "_spellattackid"] = "";
                update["repeating_spell-" + spelllvl + "_" + spellid + "_spelloutput"] = "SPELLCARD";
                setAttrs(update, { silent: true });
            }
        });
    };
});

on("remove:repeating_resource", function (eventinfo) {
    const resourceid = eventinfo.sourceAttribute.substring(19, 39);
    let update = {};

    _.each(['left', 'right'], (side) => {
        const itemid = eventinfo.removedInfo[`repeating_resource_${resourceid}_resource_${side}_itemid`];
        if (itemid) {
            update[`repeating_inventory_${itemid}_useasresource`] = 0;
            update[`repeating_inventory_${itemid}_itemresourceid`] = "";
        };
    });

    setAttrs(update, { silent: true });
});

on("remove:repeating_spell-cantrip remove:repeating_spell-1 remove:repeating_spell-2 remove:repeating_spell-3 remove:repeating_spell-4 remove:repeating_spell-5 remove:repeating_spell-6 remove:repeating_spell-7 remove:repeating_spell-8 remove:repeating_spell-9", function (eventinfo) {
    var attackid = eventinfo.removedInfo[eventinfo.sourceAttribute + "_spellattackid"];
    if (attackid) {
        remove_attack(attackid);
    }
});

on("clicked:relaunch_lvl1mancer", function (eventinfo) {
    getAttrs(["l1mancer_status"], function (v) {
        if (v["l1mancer_status"] === "completed") {
            setAttrs({ l1mancer_status: "relaunch" });
        }
        check_l1_mancer();
    });
});

on("clicked:launch_lvl+mancer", function (eventinfo) {
    getAttrs(["class", "level", "hp_max", "custom_class", "multiclass1_flag", "multiclass2_flag", "multiclass3_flag", "multiclass1", "multiclass2", "multiclass3"], function (v) {
        var throw_warning = false;
        var class_array = [v["class"]];
        if (!v["class"] || !v["hp_max"] || isNaN(parseInt(v["hp_max"], 10)) || !v["level"] || isNaN(parseInt(v["level"], 10)) || parseInt(v["level"], 10) < 1 || (v["multiclass2_flag"] == 1 && v["multiclass1_flag"] == 0) || (v["multiclass3_flag"] == 1 && v["multiclass2_flag"] == 0)) {
            throw_warning = true;
        };

        if (v["multiclass1_flag"] == 1) { class_array.push(v["multiclass1"]) };
        if (v["multiclass2_flag"] == 1) { class_array.push(v["multiclass2"]) };
        if (v["multiclass3_flag"] == 1) { class_array.push(v["multiclass3"]) };
        // Check to see if there are any duplicate multiclasses
        if ((new Set(class_array)).size !== class_array.length) {
            throw_warning = true;
        };

        if (throw_warning === true) {
            setAttrs({ leveler_warningflag: "show" });
            return;
        };

        setAttrs({ lpmancer_status: "active" }, function () {
            startCharactermancer("lp-welcome");
        });
    });

});

on("change:experience", function (eventinfo) {
    update_leveler_display();
});

var update_attr = function (attr) {
    var update = {};
    var attr_fields = [attr + "_base", attr + "_bonus"];
    getSectionIDs("repeating_inventory", function (idarray) {
        _.each(idarray, function (currentID, i) {
            attr_fields.push("repeating_inventory_" + currentID + "_equipped");
            attr_fields.push("repeating_inventory_" + currentID + "_itemmodifiers");
        });
        getAttrs(attr_fields, function (v) {
            var base = v[attr + "_base"] && !isNaN(parseInt(v[attr + "_base"], 10)) ? parseInt(v[attr + "_base"], 10) : 10;
            var bonus = v[attr + "_bonus"] && !isNaN(parseInt(v[attr + "_bonus"], 10)) ? parseInt(v[attr + "_bonus"], 10) : 0;
            var item_base = 0;
            var item_bonus = 0;
            _.each(idarray, function (currentID) {
                if ((!v["repeating_inventory_" + currentID + "_equipped"] || v["repeating_inventory_" + currentID + "_equipped"] === "1") && v["repeating_inventory_" + currentID + "_itemmodifiers"] && v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().indexOf(attr > -1)) {
                    var mods = v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().split(",");
                    _.each(mods, function (mod) {
                        if (mod.indexOf(attr) > -1 && mod.indexOf("save") === -1) {
                            if (mod.indexOf(":") > -1) {
                                var new_base = !isNaN(parseInt(mod.replace(/[^0-9]/g, ""), 10)) ? parseInt(mod.replace(/[^0-9]/g, ""), 10) : false;
                                item_base = new_base && new_base > item_base ? new_base : item_base;
                            }
                            else if (mod.indexOf("-") > -1) {
                                var new_mod = !isNaN(parseInt(mod.replace(/[^0-9]/g, ""), 10)) ? parseInt(mod.replace(/[^0-9]/g, ""), 10) : false;
                                item_bonus = new_mod ? item_bonus - new_mod : item_bonus;
                            }
                            else {
                                var new_mod = !isNaN(parseInt(mod.replace(/[^0-9]/g, ""), 10)) ? parseInt(mod.replace(/[^0-9]/g, ""), 10) : false;
                                item_bonus = new_mod ? item_bonus + new_mod : item_bonus;
                            }
                        };
                    });
                }
            });

            update[attr + "_flag"] = bonus > 0 || item_bonus > 0 || item_base > base ? 1 : 0;
            base = base > item_base ? base : item_base;
            update[attr] = base + bonus + item_bonus;
            setAttrs(update);
        });
    });
};

var update_mod = function (attr) {
    getAttrs([attr], function (v) {
        var attr_abr = attr.substring(0, 3);
        var finalattr = v[attr] && isNaN(v[attr]) === false ? Math.floor((parseInt(v[attr], 10) - 10) / 2) : 0;
        var update = {};
        update[attr + "_mod"] = finalattr;
        update["npc_" + attr_abr + "_negative"] = v[attr] && !isNaN(v[attr]) && parseInt(v[attr], 10) < 10 ? 1 : 0;
        setAttrs(update);
    });
};

var update_save = function (attr) {
    var save_attrs = [attr + "_mod", attr + "_save_prof", attr + "_save_mod", "pb", "globalsavemod", "pb_type"];
    getSectionIDs("repeating_inventory", function (idarray) {
        _.each(idarray, function (currentID, i) {
            save_attrs.push("repeating_inventory_" + currentID + "_equipped");
            save_attrs.push("repeating_inventory_" + currentID + "_itemmodifiers");
        });

        getAttrs(save_attrs, function (v) {
            var attr_mod = v[attr + "_mod"] ? parseInt(v[attr + "_mod"], 10) : 0;
            var prof = v[attr + "_save_prof"] && v[attr + "_save_prof"] != 0 && !isNaN(v["pb"]) ? parseInt(v["pb"], 10) : 0;
            var save_mod = v[attr + "_save_mod"] && !isNaN(parseInt(v[attr + "_save_mod"], 10)) ? parseInt(v[attr + "_save_mod"], 10) : 0;
            var global = v["globalsavemod"] && !isNaN(v["globalsavemod"]) ? parseInt(v["globalsavemod"], 10) : 0;
            var items = 0;
            _.each(idarray, function (currentID) {
                if (v["repeating_inventory_" + currentID + "_equipped"] && v["repeating_inventory_" + currentID + "_equipped"] === "1" && v["repeating_inventory_" + currentID + "_itemmodifiers"] && (v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().indexOf("saving throws") > -1 || v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().indexOf(attr + " save") > -1)) {
                    var mods = v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().split(",");
                    _.each(mods, function (mod) {
                        if (mod.indexOf(attr + " save") > -1) {
                            var substr = mod.slice(mod.lastIndexOf(attr + " save") + attr.length + " save".length);
                            var bonus = substr && substr.length > 0 && !isNaN(parseInt(substr, 10)) ? parseInt(substr, 10) : 0;
                        }
                        else if (mod.indexOf("saving throws") > -1) {
                            var substr = mod.slice(mod.lastIndexOf("saving throws") + "saving throws".length);
                            var bonus = substr && substr.length > 0 && !isNaN(parseInt(substr, 10)) ? parseInt(substr, 10) : 0;
                        };
                        if (bonus && bonus != 0) {
                            items = items + bonus;
                        };
                    });
                }
            });
            var total = attr_mod + prof + save_mod + global + items;
            if (v["pb_type"] && v["pb_type"] === "die" && v[attr + "_save_prof"] != 0 && attr != "death") {
                total = total + "+" + v["pb"];
            };
            var update = {};
            update[attr + "_save_bonus"] = total;
            setAttrs(update, { silent: true });
        });
    });
};

var update_all_saves = function () {
    update_save("strength");
    update_save("dexterity");
    update_save("constitution");
    update_save("intelligence");
    update_save("wisdom");
    update_save("charisma");
    update_save("death");
};

var update_all_ability_checks = function () {
    update_initiative();
    update_skills(["athletics", "acrobatics", "sleight_of_hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal_handling", "insight", "medicine", "perception", "survival", "deception", "intimidation", "performance", "persuasion"]);
};

var update_skills = function (skills_array) {
    var skill_parent = { athletics: "strength", acrobatics: "dexterity", sleight_of_hand: "dexterity", stealth: "dexterity", arcana: "intelligence", history: "intelligence", investigation: "intelligence", nature: "intelligence", religion: "intelligence", animal_handling: "wisdom", insight: "wisdom", medicine: "wisdom", perception: "wisdom", survival: "wisdom", deception: "charisma", intimidation: "charisma", performance: "charisma", persuasion: "charisma" };
    var attrs_to_get = ["pb", "pb_type", "jack_of_all_trades", "jack"];
    var update = {};
    var callbacks = [];

    if (skills_array.indexOf("perception") > -1) {
        callbacks.push(function () { update_passive_perception(); })
    };

    _.each(skills_array, function (s) {
        if (skill_parent[s] && attrs_to_get.indexOf(skill_parent[s]) === -1) { attrs_to_get.push(skill_parent[s] + "_mod") };
        attrs_to_get.push(s + "_prof");
        attrs_to_get.push(s + "_type");
        attrs_to_get.push(s + "_flat");
    });

    getSectionIDs("repeating_inventory", function (idarray) {
        _.each(idarray, function (currentID, i) {
            attrs_to_get.push("repeating_inventory_" + currentID + "_equipped");
            attrs_to_get.push("repeating_inventory_" + currentID + "_itemmodifiers");
        });

        getAttrs(attrs_to_get, function (v) {
            console.log("UPDATING SKILLS");
            _.each(skills_array, function (s) {
                var attr_mod = v[skill_parent[s] + "_mod"] ? parseInt(v[skill_parent[s] + "_mod"], 10) : 0;
                var prof = v[s + "_prof"] != 0 && !isNaN(v["pb"]) ? parseInt(v["pb"], 10) : 0;
                var flat = v[s + "_flat"] && !isNaN(parseInt(v[s + "_flat"], 10)) ? parseInt(v[s + "_flat"], 10) : 0;
                var type = v[s + "_type"] && !isNaN(parseInt(v[s + "_type"], 10)) ? parseInt(v[s + "_type"], 10) : 1;
                var jack = v["jack_of_all_trades"] && v["jack_of_all_trades"] != 0 && v["jack"] ? v["jack"] : 0;
                var item_bonus = 0;

                _.each(idarray, function (currentID) {
                    if (v["repeating_inventory_" + currentID + "_equipped"] && v["repeating_inventory_" + currentID + "_equipped"] === "1" && v["repeating_inventory_" + currentID + "_itemmodifiers"] && (v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().replace(/ /g, "_").indexOf(s) > -1 || v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().indexOf("ability checks") > -1)) {
                        var mods = v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().split(",");
                        _.each(mods, function (mod) {
                            if (mod.replace(/ /g, "_").indexOf(s) > -1 || mod.indexOf("ability checks") > -1) {
                                if (mod.indexOf("-") > -1) {
                                    var new_mod = !isNaN(parseInt(mod.replace(/[^0-9]/g, ""), 10)) ? parseInt(mod.replace(/[^0-9]/g, ""), 10) : false;
                                    item_bonus = new_mod ? item_bonus - new_mod : item_bonus;
                                }
                                else {
                                    var new_mod = !isNaN(parseInt(mod.replace(/[^0-9]/g, ""), 10)) ? parseInt(mod.replace(/[^0-9]/g, ""), 10) : false;
                                    item_bonus = new_mod ? item_bonus + new_mod : item_bonus;
                                }
                            };
                        });
                    };
                });

                var total = attr_mod + flat + item_bonus;

                if (v["pb_type"] && v["pb_type"] === "die") {
                    if (v[s + "_prof"] != 0) {
                        type === 1 ? "" : "2"
                        total = total + "+" + type + v["pb"];
                    }
                    else if (v[s + "_prof"] == 0 && jack != 0) {
                        total = total + "+" + jack;
                    };
                }
                else {
                    if (v[s + "_prof"] != 0) {
                        total = total + (prof * type);
                    }
                    else if (v[s + "_prof"] == 0 && jack != 0) {
                        total = total + parseInt(jack, 10);
                    };

                };
                update[s + "_bonus"] = total;
            });

            setAttrs(update, { silent: true }, function () { callbacks.forEach(function (callback) { callback(); }) });
        });
    });
};

var update_tool = function (tool_id) {
    //D&D 5e Mancer: Land Vehicles proficiency does not drop with Marine background (UC748)
    //Added a test to check for an undefined tool_id so to prevent similar errors.
    //By Miguel Peres
    if (typeof tool_id == "undefined") return;

    if (tool_id.substring(0, 1) === "-" && tool_id.length === 20) {
        do_update_tool([tool_id]);
    }
    else if (tool_id === "all") {
        getSectionIDs("repeating_tool", function (idarray) {
            do_update_tool(idarray);
        });
    }
    else {
        getSectionIDs("repeating_tool", function (idarray) {
            var tool_attribs = [];
            _.each(idarray, function (id) {
                tool_attribs.push("repeating_tool_" + id + "_toolattr_base");
            });
            getAttrs(tool_attribs, function (v) {
                var attr_tool_ids = [];
                _.each(idarray, function (id) {
                    if (v["repeating_tool_" + id + "_toolattr_base"] && v["repeating_tool_" + id + "_toolattr_base"].indexOf(tool_id) > -1) {
                        attr_tool_ids.push(id);
                    }
                });
                if (attr_tool_ids.length > 0) {
                    do_update_tool(attr_tool_ids);
                }
            });
        });
    };
};

var do_update_tool = function (tool_array) {
    var tool_attribs = ["pb", "pb_type", "jack", "strength_mod", "dexterity_mod", "constitution_mod", "intelligence_mod", "wisdom_mod", "charisma_mod"];
    var update = {};
    _.each(tool_array, function (tool_id) {
        tool_attribs.push("repeating_tool_" + tool_id + "_toolbonus_base");
        tool_attribs.push("repeating_tool_" + tool_id + "_tool_mod");
        tool_attribs.push("repeating_tool_" + tool_id + "_toolattr_base");
    });

    getAttrs(tool_attribs, function (v) {
        _.each(tool_array, function (tool_id) {
            console.log("UPDATING TOOL: " + tool_id);
            var query = false;
            if (v["repeating_tool_" + tool_id + "_toolattr_base"] && v["repeating_tool_" + tool_id + "_toolattr_base"].substring(0, 2) === "?{") {
                update["repeating_tool_" + tool_id + "_toolattr"] = "QUERY";
                var mod = "?{Attribute?|Strength,@{strength_mod}|Dexterity,@{dexterity_mod}|Constitution,@{constitution_mod}|Intelligence,@{intelligence_mod}|Wisdom,@{wisdom_mod}|Charisma,@{charisma_mod}}";
                if (v["repeating_tool_" + tool_id + "_tool_mod"]) {
                    mod = mod + "+" + v["repeating_tool_" + tool_id + "_tool_mod"];
                }
                query = true;
            } else {
                var attr = v["repeating_tool_" + tool_id + "_toolattr_base"].substring(0, v["repeating_tool_" + tool_id + "_toolattr_base"].length - 5).substr(2);
                var attr_mod = v[attr + "_mod"] ? parseInt(v[attr + "_mod"], 10) : 0;
                var tool_mod = v["repeating_tool_" + tool_id + "_tool_mod"] && !isNaN(parseInt(v["repeating_tool_" + tool_id + "_tool_mod"], 10)) ? parseInt(v["repeating_tool_" + tool_id + "_tool_mod"], 10) : 0;
                var mod = attr_mod + tool_mod;
                update["repeating_tool_" + tool_id + "_toolattr"] = attr.toUpperCase();
                if (v["repeating_tool_" + tool_id + "_tool_mod"] && v["repeating_tool_" + tool_id + "_tool_mod"].indexOf("@{") > -1) {
                    update["repeating_tool_" + tool_id + "_toolbonus"] = update["repeating_tool_" + tool_id + "_toolbonus"] + "+" + v["repeating_tool_" + tool_id + "_tool_mod"];
                }
                if (!v["repeating_tool_" + tool_id + "_tool_mod"]) {
                    update["repeating_tool_" + tool_id + "_tool_mod"] = 0;
                }
            };

            if (v["pb_type"] && v["pb_type"] === "die") {
                if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(@{pb})") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + "+" + v.pb }
                else if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(@{pb}*2)") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + "+2" + v.pb }
                else if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(floor(@{pb}/2))") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + "+" + v.jack };
            }
            else if (v["repeating_tool_" + tool_id + "_toolattr_base"] && v["repeating_tool_" + tool_id + "_toolattr_base"].substring(0, 2) === "?{") {
                if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(@{pb})") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + "+" + parseInt(v.pb, 10) }
                else if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(@{pb}*2)") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + "+" + (parseInt(v.pb, 10) * 2) }
                else if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(floor(@{pb}/2))") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + "+" + parseInt(v.jack, 10) };
            }
            else {
                if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(@{pb})") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + parseInt(v.pb, 10) }
                else if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(@{pb}*2)") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + (parseInt(v.pb, 10) * 2) }
                else if (v["repeating_tool_" + tool_id + "_toolbonus_base"] === "(floor(@{pb}/2))") { update["repeating_tool_" + tool_id + "_toolbonus"] = mod + parseInt(v.jack, 10) };
            };

            if (query) {
                update["repeating_tool_" + tool_id + "_toolbonus_display"] = "?";
            }
            else {
                update["repeating_tool_" + tool_id + "_toolbonus_display"] = update["repeating_tool_" + tool_id + "_toolbonus"];
            };

        });

        setAttrs(update, { silent: true });
    });
};

var get_repeating_data = function (callback) {
    var getallrepeating = function (getobj, thiscallback, attrlist) {
        attrlist = attrlist || [];
        var thisget = getobj.pop();
        getSectionIDs(thisget.name, function (ids) {
            _.each(ids, function (sectionId) {
                _.each(thisget.list, function (attr) {
                    attrlist.push("repeating_" + thisget.name + "_" + sectionId + "_" + attr);
                });
            });
            if (getobj.length > 0) {
                getallrepeating(getobj, thiscallback, attrlist);
            } else {
                getAttrs(attrlist, function (vals) {
                    thiscallback(vals);
                });
            };
        });
    };
    var getList = [
        { name: "proficiencies", list: ["name"] },
        { name: "tool", list: ["toolname", "toolattr_base"] },
        { name: "traits", list: ["name", "source", "source_type"] },
        { name: "resource", list: ["resource_left_name", "resource_right_name"] },
        { name: "spell-cantrip", list: ["spellname", "spellattackid", "spellsource", "spellattackid"] },
        { name: "savemod", list: ["global_save_name"] },
        { name: "tohitmod", list: ["global_attack_name"] },
        { name: "damagemod", list: ["global_damage_name"] },
        { name: "acmod", list: ["global_ac_name"] },
        { name: "skillmod", list: ["global_skill_name"] },
        { name: "attack", list: ["atkname", "spellid"] },
        { name: "hpmod", list: ["levels", "source", "mod"] }
    ];
    for (var x = 1; x <= 9; x++) {
        getList.push({ name: "spell-" + x, list: ["spellname", "spellattackid", "spellsource", "spellattackid"] });
    }
    var repeating = { prof_names: [], traits: [] };
    _.each(getList, function (section) {
        if (!["proficiencies", "traits"].includes(section.name)) {
            repeating[section.name] = {};
        }
    });
    getallrepeating(getList, function (vals) {
        var traitstemp = {};
        _.each(vals, function (value, name) {
            if (name.split("_")[1] == "proficiencies") {
                repeating.prof_names.push(value.toLowerCase());
            } else if (name.split("_")[1] == "tool") {
                repeating.tool[name.split("_")[2]] = repeating.tool[name.split("_")[2]] || {};
                let attr = _.last(name.split("_"));
                repeating.tool[name.split("_")[2]][attr] = value.toLowerCase();
                if (attr == "toolname") repeating.prof_names.push(value.toLowerCase());
            } else if (name.split("_")[1] == "traits") {
                traitstemp[name.split("_")[2]] = traitstemp[name.split("_")[2]] ? traitstemp[name.split("_")[2]] : {};
                traitstemp[name.split("_")[2]][_.last(name.split("_"))] = value;
            } else if (name.split("_")[1] == "resource") {
                repeating.resource[name.split("_")[2]] = repeating.resource[name.split("_")[2]] || {};
                repeating.resource[name.split("_")[2]][name.split("_")[4]] = value;
            } else if (name.split("_")[1] == "hpmod") {
                repeating.hpmod[name.split("_")[2]] = repeating.hpmod[name.split("_")[2]] || {};
                repeating.hpmod[name.split("_")[2]][name.split("_")[3]] = value;
            } else if (name.split("_")[1].split("-")[0] == "spell") {
                repeating[name.split("_")[1]][name.split("_")[2]] = repeating[name.split("_")[1]][name.split("_")[2]] || {};
                repeating[name.split("_")[1]][name.split("_")[2]][name.split("_")[3]] = value;
            } else if (name.split("_")[1] == "attack") {
                repeating[name.split("_")[1]][name.split("_")[2]] = repeating[name.split("_")[1]][name.split("_")[2]] || {};
                repeating[name.split("_")[1]][name.split("_")[2]][name.split("_")[3]] = value;
            } else {
                repeating[name.split("_")[1]][name.split("_")[2]] = value;
            }
        });
        _.each(traitstemp, function (v, k) {
            var trait = _.clone(v);
            trait.id = k;
            repeating.traits.push(trait);
        });
        callback(repeating);
    });
};

var handle_drop = function (category, eventinfo) {

    getAttrs(["speed", "drop_name", "drop_data", "drop_content", "character_id", "npc_legendary_actions", "strength_mod", "dexterity_mod", "npc", "base_level", "strength_base", "dexterity_base", "constitution_base", "wisdom_base", "intelligence_base", "charisma_base", "class_resource_name", "other_resource_name", "multiclass1_lvl", "multiclass2_lvl", "multiclass3_lvl"], function (v) {
        var pagedata = {};
        try {
            pagedata = JSON.parse(v.drop_data);
        } catch (e) {
            pagedata = v.drop_data;
        }
        var page = {
            name: v.drop_name,
            data: pagedata,
            content: v.drop_content
        };
        var category = page.data["Category"];
        get_repeating_data(function (repeating) {
            var results = processDrop(page, v, repeating);
            setAttrs(results.update, { silent: true }, function () { results.callbacks.forEach(function (callback) { callback(); }) });
        });

    });

};

var processDrop = function (page, currentData, repeating, looped) {
    var jsonparse = function (data) {
        var result = {};
        try {
            result = JSON.parse(data);
        } catch (e) {
            result = data;
        }
        return result;
    };
    var modStringToAttrib = function (modString) {
        var finalAttrib = "";
        if (modString == "FIN") {
            if (parseInt(currentData.strength_base) > parseInt(currentData.dexterity_base)) {
                finalAttrib = "@{strength_mod}";
            } else {
                finalAttrib = "@{dexterity_mod}";
            }
        } else {
            switch (modString) {
                case "STR":
                    finalAttrib = "@{strength_mod}";
                    break;
                case "DEX":
                    finalAttrib = "@{dexterity_mod}";
                    break;
                case "CON":
                    finalAttrib = "@{constitution_mod}";
                    break;
                case "WIS":
                    finalAttrib = "@{wisdom_mod}";
                    break;
                case "INT":
                    finalAttrib = "@{intelligence_mod}";
                    break;
                case "CHA":
                    finalAttrib = "@{charisma_mod}";
                    break;
            }
        }
        return finalAttrib;
    };
    var numUses = function (uses_string) {
        uses_string = parseValues(uses_string);

        var terms = uses_string.split("+");
        var total = 0;
        _.each(terms, function (term) {
            total += parseInt(term);
        });
        return uses_string === "" || uses_string === "-" ? uses_string : total;
    };
    var parseValues = function (uses_string) {
        var attribs = ["strength", "dexterity", "constitution", "wisdom", "intelligence", "charisma"];
        uses_string = uses_string ? uses_string.toLowerCase() : "";
        _.each(attribs, function (attrib) {
            var attribMod = Math.floor((parseInt(currentData[attrib + "_base"]) - 10) / 2);
            if (attribMod < 0 || isNaN(attribMod)) attribMod = 0;
            uses_string = uses_string.replace(attrib, attribMod);
        });
        uses_string = uses_string.replace(/half_level/g, Math.floor(classlevel / 2));
        return uses_string.replace(/level/g, classlevel);
    };//
    var category = page.data["Category"];
    var callbacks = [];
    var update = {};
    var id = generateRowID();
    var blobs = {};
    var classlevel = currentData.base_level ? parseInt(currentData.base_level) : 1;
    repeating.traits = repeating.traits ? repeating.traits : [];
    update["drop_category"] = "";
    update["drop_name"] = "";
    update["drop_data"] = "";
    update["drop_content"] = "";
    if (category === "Items") {
        console.log(`%c ITEM: ${page.name} dropped`, "color: purple; font-size: 14px;");
        if (currentData.npc === "0") {
            update["tab"] = "core";
            if (page.name) { update[`repeating_inventory_${id}_itemname`] = page.name };
            if (page.data["itemcount"]) { update[`repeating_inventory_${id}_itemcount`] = page.data["itemcount"] };

            ["Properties", "Weight"].forEach((attr) => {
                if (page.data[`${attr}`]) {
                    update[`repeating_inventory_${id}_item${attr.toLowerCase()}`] = page.data[`${attr}`]
                };
            });

            if (page.content) { update[`repeating_inventory_${id}_itemcontent`] = page.content };
            if (!page.data["Item Type"] || page.data["Item Type"] == "") { page.data["Item Type"] = category };
            var mods = "Item Type: " + page.data["Item Type"];
            if (page.data["AC"] && page.data["AC"] != "") {
                mods += ", AC: " + page.data["AC"];
                if (!looped) {
                    callbacks.push(() => { update_ac(); })
                }
            };

            ["Damage", "Damage Type", "Secondary Damage", "Secondary Damage Type", "Alternate Damage", "Alternate Damage Type", "Alternate Secondary Damage", "Alternate Secondary Damage Type", "Range"].forEach((attr) => {
                if (page.data[`${attr}`] && page.data[`${attr}`] != "") {
                    mods += `, ${attr}: ${page.data[`${attr}`]}`
                };
            });

            if (page.data["Modifiers"] && page.data["Modifiers"] != "") { mods += `, ${page.data["Modifiers"]}` };
            update[`repeating_inventory_${id}_itemmodifiers`] = mods;
            if (page.data["Item Type"].indexOf("Weapon") > -1) {
                update[`repeating_inventory_${id}_hasattack`] = 1;
                callbacks.push(() => {
                    (page.data["Alternate Damage"] && page.data["Alternate Damage"] !== "") ? create_attack_from_item(id, { versatile: true }) : create_attack_from_item(id);
                });
            } else if (page.data["Item Type"].indexOf("Ammunition") > -1) {
                update[`repeating_inventory_${id}_useasresource`] = 1;
                callbacks.push(() => { create_resource_from_item(id); });
            };

            if (page.data["Modifiers"]) {
                callbacks.push(() => { check_itemmodifiers(page.data["Modifiers"]); });
            };

            if (!looped) {
                callbacks.push(() => { update_weight(); });
            }
        } else {
            if (page.data["Item Type"] && page.data["Item Type"].toLowerCase().includes("weapon")) {
                const type = (page.data["Item Type"]) ? page.data["Item Type"].toLowerCase().split(" ")[0] : " ";
                const properties = (page.data["Properties"]) ? page.data["Properties"].toLowerCase() : undefined;

                const make_npc_attack_from_item = (rowid, options) => {
                    update[`repeating_npcaction_${rowid}_npc_options-flag`] = "0";
                    update[`repeating_npcaction_${rowid}_attack_flag`] = "on";
                    if (page.name) {
                        update[`repeating_npcaction_${rowid}_name`] = page.name;
                        if (options && options.versatile) {
                            update[`repeating_npcaction_${rowid}_name`] += " (" + (options.versatile === 1 ? "One-Handed" : "Two-Handed") + ")";
                        } else if (options && options.thrown) {
                            update[`repeating_npcaction_${rowid}_name`] += " (Thrown)";
                        };
                    };
                    if (page.content) { update[`repeating_npcaction_${rowid}_description`] = page.content; }

                    update[`repeating_npcaction_${rowid}_attack_display_flag`] = "{{ attack=1 }}";
                    update[`repeating_npcaction_${rowid}_attack_options`] = "{{ attack=1 }}";
                    update[`repeating_npcaction_${rowid}_attack_type`] = page.data["Item Type"];
                    update[`repeating_npcaction_${rowid}_attack_target`] = "one target";


                    update[`repeating_npcaction_${rowid}_attack_range`] =
                        (page.data["Range"] && page.data["Range"] != "" && (!properties.includes("thrown") || (options && options.thrown))) ? page.data["Range"] :
                            (page.data["Properties"] && properties.includes("range")) ? "10 ft" :
                                "5 ft";

                    const weapon_attr_mod = (type.includes("ranged") || (properties && properties.includes("finesse") && currentData.dexterity_mod > currentData.strength_mod)) ? currentData.dexterity_mod : currentData.strength_mod;
                    update[`repeating_npcaction_${rowid}_attack_tohit`] = weapon_attr_mod;

                    const dmgArray = (options && options.versatile === 2) ?
                        ["Alternate Damage", "Alternate Damage Type", "Alternate Secondary Damage", "Alternate Secondary Damage Type"] :
                        ["Damage", "Damage Type", "Secondary Damage", "Secondary Damage Type"];

                    dmgArray.forEach((attr) => {
                        if (page.data[`${attr}`]) {
                            // _attack_damage adds the weapon mod
                            const ending = (dmgArray.indexOf(`${attr}`) === 0) ? `+${weapon_attr_mod}` : "";
                            //Remove Alternate for the attribute name. Then check for Secondary and remote it while adding 2.
                            let attrEdit = (attr.includes("Alternate") && attr.includes("Secondary")) ? attr.slice(20) + "2" : (attr.includes("Alternate") || attr.includes("Secondary")) ? attr.slice(10) : attr;
                            //Lower case everything and remove spaces
                            let name = attrEdit.toLowerCase().replace(" ", "");
                            //Set all the necessary attack attributes
                            update[`repeating_npcaction_${rowid}_attack_${name}`] = page.data[`${attr}`] + [`${ending}`];
                        };
                    });

                    if (page.data["Modifiers"]) {
                        if (type === "melee" || type === "ranged") {
                            //+1 Weapons should be in the format of "Melee Attacks +1, Melee Damage +1"
                            const split = (page.data["Modifiers"].includes(",")) ? page.data["Modifiers"].split(", ") : page.data["Modifiers"];
                            split.forEach((attr) => {
                                const name = attr.toLowerCase();
                                if (name.includes("attacks")) {
                                    update[`repeating_npcaction_${rowid}_attack_tohit`] = +update[`repeating_npcaction_${rowid}_attack_tohit`] + name.split("attacks ")[1];
                                } else if (name.includes("damage")) {
                                    update[`repeating_npcaction_${rowid}_attack_damage`] += name.split("damage ")[1];
                                } else {
                                    console.log(`%c ${page.name} modifiers format did not include damage or attacks`, "color:orange;");
                                };
                            });
                        };
                    };
                };

                const versatile = (properties && properties.includes("versatile")) ? 1 : undefined;
                make_npc_attack_from_item(id, { versatile: versatile });

                if (properties && properties.includes("thrown")) {
                    make_npc_attack_from_item(generateRowID(), { thrown: true });
                }
                if (versatile && page.data["Alternate Damage"]) {
                    make_npc_attack_from_item(generateRowID(), { versatile: 2 })
                }

                if (page.data["Modifiers"]) {
                    callbacks.push(() => { check_itemmodifiers(page.data["Modifiers"]); }, () => { update_npc_action("all"); });
                } else {
                    callbacks.push(() => { update_npc_action("all"); });
                };
            }
        }
    };
    if (category === "Spells") {
        console.log(`%c SPELL: ${page.name} dropped`, "color: purple; font-weight:14px;");
        let existing = {};
        var lvl = page.data["Level"] && page.data["Level"] > 0 ? page.data["Level"] : "cantrip";
        if (repeating[`spell-${lvl}`]) {
            _.each(repeating[`spell-${lvl}`], (spell, spellid) => {
                if (spell.spellname.toLowerCase() === page.name.toLowerCase()) {
                    id = spellid;
                    existing = spell;
                };
            });
        }

        update[`repeating_spell-${lvl}_${id}_spelllevel`] = lvl;
        update[`repeating_spell-${lvl}_${id}_spell_ability`] = (page.data["spellcasting_ability"]) ? `@{${page.data["spellcasting_ability"].toLowerCase()}_mod}+` : "spell";
        (page.name) ? update[`repeating_spell-${lvl}_${id}_spellname`] = page.name : false;

        ["spellclass", "spellsource", "data-description"].forEach((attr) => {
            const suffix = (attr.includes("description")) ? "spelldescription" : attr;
            (page.data[`${attr}`]) ? update[`repeating_spell-${lvl}_${id}_${suffix}`] = page.data[`${attr}`] : false;
        });

        ["Add Casting Modifier", "Casting Time", "Concentration", "Damage Type", "Damage", "Duration", "Healing", "Material", "Range", "Ritual", "Save", "Save Success", "School", "Secondary Damage", "Secondary Damage Type", "Target"].forEach((attr) => {
            if (page.data[`${attr}`]) {
                //Adjust the array entry to match the attribute name in the HTML
                const name = (attr === "Add Casting Modifier") ? "dmgmod" : (attr === "Material") ? `comp_materials` : (attr.includes("Secondary Damage")) ? attr.split("Secondary ")[0] + "2" : attr;
                const spellattribute = name.toLowerCase().replace(" ", "");
                //Concentration, Ritual, and School are exceptions to norm
                const updateValue = (attr === "Concentration" || attr === "Ritual") ? `{{ ${spellattribute}=1}}` : (attr === "School") ? page.data["School"].toLowerCase() : page.data[`${attr}`];
                update[`repeating_spell-${lvl}_${id}_spell${spellattribute}`] = updateValue;
            };
        });

        ["Higher Spell Slot Bonus", "Higher Spell Slot Desc", "Higher Spell Slot Dice", "Higher Spell Slot Die"].forEach((attr) => {
            if (page.data[`${attr}`]) {
                const spellattribute = (attr.includes("Bonus")) ? "hlbonus" : (attr.includes("Desc")) ? "athigherlevels" : (attr.includes("Dice")) ? "hldie" : "hldietype";
                update[`repeating_spell-${lvl}_${id}_spell${spellattribute}`] = page.data[`${attr}`];
            };
        });

        if (page.data["Components"]) {
            ["v", "s", "m"].forEach((comp) => {
                if (page.data["Components"].toLowerCase().indexOf(comp) === -1) { update[`repeating_spell-${lvl}_${id}_spellcomp_${comp}`] = "0" };
            });
        };

        if (page.data["Spell Attack"]) {
            update[`repeating_spell-${lvl}_${id}_spellattack`] = page.data[`Spell Attack`];
        };

        if (page.data["Damage"] || page.data["Healing"]) {
            update["repeating_spell-" + lvl + "_" + id + "_spelloutput"] = "ATTACK";
            if (!existing.spellattackid) callbacks.push(function () { create_attack_from_spell(lvl, id, currentData.character_id); });
        }
        else if (page.data["Higher Spell Slot Desc"] && page.data["Higher Spell Slot Desc"] != "") {
            var spelllevel = "?{Cast at what level?";
            for (i = 0; i < 10 - lvl; i++) {
                spelllevel = spelllevel + "|Level " + (parseInt(i, 10) + parseInt(lvl, 10)) + "," + (parseInt(i, 10) + parseInt(lvl, 10));
            };
            spelllevel = spelllevel + "}";
            update[`repeating_spell-${lvl}_${id}_rollcontent`] = `@{wtype}&{template: spell} {{ level=@{spellschool} ${spelllevel}}} {{ name=@{spellname}}} {{ castingtime=@{spellcastingtime}}} {{ range=@{spellrange}}} {{ target=@{spelltarget}}} @{spellcomp_v} @{spellcomp_s} @{spellcomp_m} {{ material=@{spellcomp_materials}}} {{ duration=@{spellduration}}} {{ description=@{spelldescription}}} {{ athigherlevels=@{spellathigherlevels}}} @{spellritual} {{ innate=@{innate}}} @{spellconcentration} @{charname_output} {{ licensedsheet=@{licensedsheet}}}`;
        };

        if (page.data["data-Cantrip Scaling"] && lvl == "cantrip") { update[`repeating_spell-${lvl}_${id}_spell_damage_progression`] = "Cantrip " + page.data["data-Cantrip Scaling"].charAt(0).toUpperCase() + page.data["data-Cantrip Scaling"].slice(1); };
        update[`repeating_spell-${lvl}_${id}_options-flag`] = "0";
    };
    if (category === "Monsters") {
        console.log(`%c MONSTERS: ${page.name} dropped`, "color: purple; font-weight:14px;");
        update["npc"] = "1";
        update["npc_options-flag"] = "0";
        update["licensedsheet"] = "1";
        if (page.name && page.name != "") { update["npc_name"] = page.name };

        //ABILITY SCORES
        const npcAbilites = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
        npcAbilites.forEach((ability) => {
            const abbreviation = ability.slice(0, 3).toUpperCase();
            update[`${ability}_base`] = (page.data[`${abbreviation}`]) ? page.data[`${abbreviation}`] : "";
            callbacks.push(() => {
                update_attr(`${ability}`);
            });
        });

        const npcExtras = ["Condition Immunities", "Immunities", "Languages", "Resistances", "Speed", "Token Size", "Vulnerabilities"];
        npcExtras.forEach((attr) => {
            //console.log(`%c MONSTERS Drop: ${attr}`, "color:cornflowerblue;");
            const prefixExtra = (attr === "Token Size") ? "" : "npc_";
            let nameExtra = (attr.includes(" ")) ? attr.replace(" ", "_").toLowerCase() : attr.toLowerCase();
            update[`${prefixExtra}${nameExtra}`] = (page.data[`${attr}`]) ? page.data[`${attr}`] : "";
        });

        //CHALLENGE RATING
        if (page.data["Challenge Rating"] && page.data["Challenge Rating"] != "") {
            callbacks.push(function () { update_challenge(); });
            update["npc_challenge"] = page.data["Challenge Rating"];
        } else {
            update["npc_challenge"] = "";
        };

        //XP
        if (page.data["data-XP"]) { update["npc_xp"] = page.data["data-XP"].toString().replace(",", ""); };

        //SIZE, TYPE, ALIGNMENT
        var type = "";
        if (page.data["Size"]) { type = page.data["Size"] };
        if (page.data["Type"]) { type = (type.length > 0) ? type + " " + page.data["Type"].toLowerCase() : page.data["Type"].toLowerCase(); };
        if (page.data["Alignment"]) { type = (type.length > 0) ? type + ", " + page.data["Alignment"] : page.data["Alignment"]; };
        update["npc_type"] = type;

        ["AC", "HP"].forEach((achp) => {
            //console.log(`%c MONSTERS Drop: AC & HP ${achp}`, "color:cornflowerblue;");
            const array = (achp === "AC") ? ["npc_ac", "npc_actype"] : ["hp_max", "npc_hpformula"];
            if (page.data[`${achp}`] && page.data[`${achp}`].toString().indexOf("(") > -1) {
                update[`${array[0]}`] = page.data[`${achp}`].toString().split(" (")[0];
                update[`${array[1]}`] = page.data[`${achp}`].toString().split(" (")[1].slice(0, -1);
            } else {
                update[`${array[0]}`] = (page.data[`${achp}`]) ? page.data[`${achp}`] : "";
                update[`${array[1]}`] = "";
            };
        });

        var senses = page.data["Senses"] ? page.data["Senses"] : "";
        if (page.data["Passive Perception"]) {
            senses = (senses.length > 0) ? senses + ", passive Perception " + page.data["Passive Perception"] : "passive Perception " + page.data["Passive Perception"];
        }
        update["npc_senses"] = senses;

        //SAVES & SKILLS
        const npcSavesSkills = ["str_save", "dex_save", "con_save", "int_save", "wis_save", "cha_save", 'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'];
        npcSavesSkills.forEach((attr) => {
            update[`npc_${attr}_base`] = "";
        });
        ["Saving Throws", "Skills"].forEach((attr) => {
            //console.log(`%c MONSTERS Drop: Saving Throws & Skills: ${attr}`, "color:cornflowerblue;");
            const array = (page.data[`${attr}`]) ? page.data[`${attr}`].split(", ") : [];
            _.each(array, (entry) => {
                const kv = (entry.indexOf("-") > -1) ? entry.split(" ") : entry.split(" +");
                const attribute = (attr === "Saving Throws") ? kv[0].toLowerCase() + "_save" : kv[0].toLowerCase().split(' ').join('_');
                update[`npc_${attribute}_base`] = parseInt(kv[1], 10);
            });
            (attr === "Saving Throws") ? callbacks.push(() => { update_npc_saves(); }) : callbacks.push(() => { update_npc_skills(); });
        });

        const npcRepeating = ['npcaction-l', 'npcreaction', 'npcaction', 'npctrait'];
        _.each(npcRepeating, (section) => {
            getSectionIDs(`repeating_${section}`, (idarray) => {
                _.each(idarray, (currentID, i) => {
                    removeRepeatingRow(`repeating_${section}_${currentID}`);
                });
            });
        });
        // ACTIONS, LEGENDARY ACTIONS, REACTIONS, TRAITS
        var contentarray = page.content;
        if (page.data["data-Legendary Actions"]) {
            const actionCount = (page.data["data-LANum"]) ? page.data["data-LANum"] : 3;
            update["npc_legendary_actions"] = (page.data["data-LANum"]) ? page.data["data-LANum"] : 3;
            if (page.data["Legendary Actions Desc"]) {
                update["npc_legendary_actions_desc"] = page.data["Legendary Actions Desc"];
            } else {
                update["npc_legendary_actions_desc"] = `The ${page.name} can take ${actionCount}, choosing from the options below. Only one legendary option can be used at a time and only at the end of another creature's turn. The ${page.name} regains spent legendary actions at the start of its turn.`;
            };
        };
        // ACTIONS & LEGENDARY ACTIONS
        ["Actions", "Legendary Actions"].forEach((attr) => {
            if (page.data[`data-${attr}`]) {
                const npcaction = (attr === "Actions") ? "npcaction" : "npcaction-l";
                let actionsobj = {};
                jsonparse(page.data[`data-${attr}`]).forEach((val) => { actionsobj[val.Name] = val; });
                _.each(actionsobj, (action, name) => {
                    newrowid = generateRowID();
                    update[`repeating_${npcaction}_${newrowid}_npc_options-flag`] = "0";
                    update[`repeating_${npcaction}_${newrowid}_name`] = name;
                    (action["Desc"]) ? update[`repeating_${npcaction}_${newrowid}_description`] = action["Desc"] : false;
                    if (action["Type Attack"]) {
                        update[`repeating_${npcaction}_${newrowid}_attack_display_flag`] = "{{attack=1}}";
                        update[`repeating_${npcaction}_${newrowid}_attack_flag`] = "on";
                        update[`repeating_${npcaction}_${newrowid}_attack_options`] = "{{ attack=1 }}";

                        ["Damage Type", "Damage", "Hit Bonus", "Reach", "Target", "Type"].forEach((attr) => {
                            if (action[`${attr}`]) {
                                const attributeName = (attr === "Hit Bonus") ? "tohit" : (attr === "Reach") ? "range" : attr.toLowerCase().replace(" ", "");
                                update[`repeating_${npcaction}_${newrowid}_attack_${attributeName}`] = action[`${attr}`];
                            };
                        });

                        if (action["Damage 2"] && action["Damage 2 Type"]) {
                            update[`repeating_${npcaction}_${newrowid}_attack_damage2`] = action["Damage 2"];
                            update[`repeating_${npcaction}_${newrowid}_attack_damagetype2`] = action["Damage 2 Type"];
                        }
                    }
                });
                (attr === "Actions") ? callbacks.push(() => { update_npc_action("all"); }) : false;
            } else if (contentarray && contentarray.indexOf(`${attr}`) > -1) {
                console.log(`%c ${attr} was not found for ${page.name}`, "color: orange;");
            };
        });
        //REACTIONS
        if (page.data["data-Reactions"]) {
            update["npcreactionsflag"] = 1;
            let reactionsobj = {};
            jsonparse(page.data["data-Reactions"]).forEach((val) => { reactionsobj[val.Name] = val.Desc; });
            _.each(reactionsobj, (desc, name) => {
                newrowid = generateRowID();
                update[`repeating_npcreaction_${newrowid}_name`] = name + ".";
                if (desc.substring(0, 2) === ": " || encodeURI(desc.substring(0, 2)) === ":%C2%A0") {
                    desc = desc.substring(2);
                };
                update[`repeating_npcreaction_${newrowid}_desc`] = desc.trim();
            });
        } else if (contentarray && contentarray.indexOf("Reactions") > -1) {
            console.log(`%c Reactions was not found for ${page.name}`, "color: orange;");
        };
        //TRAITS
        if (page.data["data-Traits"]) {
            //console.log(`%c MONSTERS Drop: NPC Traits`, "color:cornflowerblue;");
            let traitsobj = {};
            jsonparse(page.data["data-Traits"]).forEach((val) => {
                traitsobj[val.Name] = (val.Name && val.Desc) ? val.Desc : "";
                if (val.Name && val.Desc) {
                    traitsobj[val.Name] = val.Desc;
                } else if (val.Name) {
                    traitsobj[val.Name] = "";
                } else {
                    console.log(`%c Traits JSON is lacking a Name key`, "color: orange;")
                };
            });
            _.each(traitsobj, (desc, name) => {
                newrowid = generateRowID();
                update[`repeating_npctrait_${newrowid}_name`] = name + ".";
                if (desc.substring(0, 2) === ": " || encodeURI(desc.substring(0, 2)) === ":%C2%A0") {
                    desc = desc.substring(2);
                }
                update[`repeating_npctrait_${newrowid}_desc`] = desc.trim();
                // SPELLCASTING NPCS
                if (name === "Spellcasting") {
                    var lvl = parseInt(desc.substring(desc.indexOf("-level") - 4, desc.indexOf("-level") - 2).trim(), 10);
                    lvl = !isNaN(lvl) ? lvl : 1;
                    var ability = desc.match(/casting ability is (.*?) /);
                    ability = ability && ability.length > 1 ? ability[1] : false;
                    ability = ability ? "@{" + ability.toLowerCase() + "_mod}+" : "0*";
                    update["base_level"] = lvl;
                    update["caster_level"] = lvl;
                    update["class"] = "Wizard";
                    update["level"] = lvl;
                    update["npcspellcastingflag"] = 1;
                    update["spellcasting_ability"] = ability;
                    callbacks.push(() => { update_pb(); });
                    callbacks.push(() => { update_spell_slots(); });
                }
                //Githzerai in MToF have (Psionics)
                if (name.includes("Innate Spellcasting")) {
                    const ability = (page.data["Spellcasting Ability"]) ? `@{${page.data["Spellcasting Ability"].toLowerCase()}_mod}+` : "0*";
                    update["npcspellcastingflag"] = 1;
                    update["spellcasting_ability"] = ability;
                };
            });
        } else if (contentarray && contentarray.indexOf("Traits") > -1) {
            console.log(`%c Traits was not found for ${page.name}`, "color: orange;");
        };
        //Spells
        if (page.data["data-Spells"]) {
            let spellsobj = [];
            //Put together a list of spells to get from the Comepndium
            ["spells", "innate"].forEach((type) => {
                let spellList = jsonparse(page.data["data-Spells"])[`${type}`];
                if (spellList) {
                    Object.keys(spellList).map((objectKey, index) => {
                        spellList[objectKey].forEach((spell) => {
                            spellsobj.push(spell);
                        });
                    });
                };
            });
            getCompendiumPage(spellsobj, (compendiumPages) => {
                compendiumPages = removeDuplicatedPageData(compendiumPages);
                const spellData = (compendiumPages.length === undefined || compendiumPages.length === 1) ? [compendiumPages] : compendiumPages;
                const innate = (jsonparse(page.data["data-Spells"])[`innate`]) ? jsonparse(page.data["data-Spells"])[`innate`] : false;
                let existing = {};
                let update = [], callbacks = [];

                spellData.forEach((page) => {
                    const spell = page.data;
                    const lvl = spell["Level"] && spell["Level"] > 0 ? spell["Level"] : "cantrip";
                    const newrowid = generateRowID();
                    const repeatingRow = `repeating_spell-${lvl}_${newrowid}`;

                    update[`${repeatingRow}_spelllevel`] = lvl;
                    update[`${repeatingRow}_spell_ability`] = (update["spellcasting_ability"]) ? update["spellcasting_ability"] : "spell";
                    (spell.Name) ? update[`${repeatingRow}_spellname`] = spell.Name : console.log(`%c ${JSON.stringify(page.name)} is incorrect. Update compendium data.`, "color: orange;");
                    update[`${repeatingRow}_spelloutput`] = (page.data["Damage"] || page.data["Healing"]) ? "ATTACK" : "SPELLCARD";

                    ["spellclass", "spellsource", "data-description"].forEach((attr) => {
                        const suffix = (attr.includes("description")) ? "spelldescription" : attr;
                        (spell[`${attr}`]) ? update[`${repeatingRow}_${suffix}`] = spell[`${attr}`] : false;
                    });

                    ["Add Casting Modifier", "Casting Time", "Concentration", "Damage Type", "Damage", "Duration", "Healing", "Material", "Range", "Ritual", "Save", "Save Success", "School", "Secondary Damage", "Secondary Damage Type", "Spell Attack", "Target"].forEach((attr) => {
                        if (spell[`${attr}`]) {
                            //Adjust the array entry to match the attribute name in the HTML
                            const name =
                                (attr === "Add Casting Modifier") ? "dmgmod" :
                                    (attr === "Material") ? `comp_materials` :
                                        (attr === "Spell Attack") ? `attack` :
                                            (attr.includes("Secondary Damage")) ? attr.split("Secondary ")[0] + "2" :
                                                attr;
                            const spellattribute = name.toLowerCase().replace(" ", "");
                            //Concentration, Ritual, and School are exceptions to norm
                            const updateValue =
                                (attr === "Concentration" || attr === "Ritual") ? `{{ ${spellattribute}=1}}` :
                                    (attr === "School") ? spell["School"].toLowerCase() :
                                        spell[`${attr}`];
                            update[`${repeatingRow}_spell${spellattribute}`] = updateValue;
                        };
                    });

                    ["Higher Spell Slot Bonus", "Higher Spell Slot Desc", "Higher Spell Slot Dice", "Higher Spell Slot Die"].forEach((attr) => {
                        if (spell[`${attr}`]) {
                            const spellattribute = (attr.includes("Bonus")) ? "hlbonus" : (attr.includes("Desc")) ? "athigherlevels" : (attr.includes("Dice")) ? "hldie" : "hldietype";
                            update[`${repeatingRow}_spell${spellattribute}`] = spell[`${attr}`];
                        };
                    });

                    if (spell["Components"]) {
                        ["v", "s", "m"].forEach((comp) => {
                            if (spell["Components"].toLowerCase().indexOf(comp) === -1) { update[`${repeatingRow}_spellcomp_${comp}`] = "0" };
                        });
                    };

                    if (page.data["Damage"] || page.data["Healing"]) {
                        //This needs to run the create_attack_from_spell
                        callbacks.push(() => { create_attack_from_spell(lvl, newrowid, currentData.character_id); });
                    } else if (page.data["Higher Spell Slot Desc"] && page.data["Higher Spell Slot Desc"] != "") {
                        //This needs to run the update_spelloutput
                    };

                    if (spell["data-Cantrip Scaling"] && lvl == "cantrip") {
                        update[`${repeatingRow}_spell_damage_progression`] = "Cantrip " + spell["data-Cantrip Scaling"].charAt(0).toUpperCase() + spell["data-Cantrip Scaling"].slice(1);
                    };

                    if (innate) {
                        const spellName = (spell.Name).toLowerCase();
                        //Search each keys in INNATE to see if spell name === one of the Values
                        Object.keys(innate).map((objectKey, index) => {
                            innate[objectKey].forEach((spell) => {
                                (spell === spellName) ? update[`${repeatingRow}_innate`] = objectKey : false;
                            });
                        });
                    };

                    update[`${repeatingRow}_options-flag`] = "0";
                });

                setAttrs(update, { silent: true }, () => {
                    callbacks.forEach((callback) => {
                        callback();
                    })
                });

                return {
                    callbacks: callbacks
                };
            });
        };
    };
    if (category === "Feats") {
        update["tab"] = "core";
        var match = { name: page.name };
        var existing = _.findWhere(repeating.traits, match);
        var newrowid = generateRowID();
        if (existing) {
            newrowid = existing.id;
            existing.name = page.name;
            existing.source = "Feat";
            existing.type = page.data["Properties"] ? page.data["Properties"] : "";
        } else {
            var newtrait = {};
            newtrait.id = newrowid;
            newtrait.name = page.name;
            newtrait.source = "Feat";
            newtrait.type = page.data["Properties"] ? page.data["Properties"] : "";
            repeating.traits.push(newtrait);
        }
        if (page.name) { update[`repeating_traits_${newrowid}_name`] = page.name };
        if (page.content) { update[`repeating_traits_${newrowid}_description`] = page.content };
        update[`repeating_traits_${newrowid}_source`] = "Feat";
        update[`repeating_traits_${newrowid}_source_type`] = page.data["Properties"] ? page.data["Properties"] : "";
        update[`repeating_traits_${newrowid}_options-flag`] = "0";
        update[`repeating_traits_${newrowid}_display_flag`] = "on";
    };
    if (category === "Proficiencies") {
        var newrowid = generateRowID();
        var type = page.data["Type"] || "";
        if (type.toLowerCase() === "language" || type.toLowerCase() === "armor" || type.toLowerCase() === "weapon" || type.toLowerCase() === "other") {
            if (repeating.prof_names.indexOf(page.name.toLowerCase()) == -1) {
                update[`repeating_proficiencies_${newrowid}_prof_type`] = type.replace("custom", "").toUpperCase();
                update[`repeating_proficiencies_${newrowid}_name`] = page.name;
                update[`repeating_proficiencies_${newrowid}_options-flag`] = 0;
                repeating.prof_names.push(page.name.toLowerCase());
            };
        } else if (type.toLowerCase() === "tool" || type.toLowerCase() === "skillcustom") {
            let existing = {};
            _.each(repeating.tool, (tool, id) => {
                if (tool.toolname == page.name.toLowerCase()) {
                    newrowid = id;
                    existing = tool;
                }
            });
            if (!existing.toolname) repeating.tool[newrowid] = { toolname: page.name.toLowerCase() }
            update[`repeating_tool_${newrowid}_toolname`] = page.name;
            if (!existing.base) update[`repeating_tool_${newrowid}_toolattr_base`] = "?{Attribute ?| Strength,@{strength_mod}|Dexterity,@{dexterity_mod}|Constitution,@{constitution_mod}|Intelligence,@{intelligence_mod}|Wisdom,@{wisdom_mod}|Charisma,@{charisma_mod}}";
            update[`repeating_tool_${newrowid}_options-flag`] = 0;
            if (page.data["toolbonus_base"]) update[`repeating_tool_${newrowid}_toolbonus_base`] = "(@{pb}*2)";
            repeating.prof_names.push(page.name.toLowerCase());
            callbacks.push(function () { update_tool(newrowid); });
        }
        if (type.toLowerCase() === "skill") {
            var skill_string = page.name.toLowerCase().replace(/ /g, '_');
            update[`${skill_string}_prof`] = `(@{pb}*@{${skill_string}_type})`;
        };
    };
    if (category === "Classes") {
        update["tab"] = "core";
        if (page.data.multiclass) {
            if (page.name && page.name !== "") { update[page.data.multiclass] = page.name; }
            update[page.data.multiclass + "_flag"] = "1";
            classlevel = parseInt(currentData[page.data.multiclass + "_lvl"]);
        } else {
            if (page.name && page.name !== "") { update["class"] = page.name; }
            if (page.data["Hit Die"] && page.data["Hit Die"] !== "") {
                update["base_level"] = currentData.base_level ? currentData.base_level : "1";
                update["hit_dice_max"] = update["base_level"] + page.data["Hit Die"];
                update["hit_dice"] = update["base_level"];
            }
            if (page.data["Spellcasting Ability"] && page.data["Spellcasting Ability"] !== "") {
                update["spellcasting_ability"] = "@{" + page.data["Spellcasting Ability"].toLowerCase() + "_mod}+";
            }
        }
        if (page.data["data-Saving Throws"] && !page.data.multiclass) {
            var saves = jsonparse(page.data["data-Saving Throws"]);
            _.each(saves, function (value) {
                update[value.toLowerCase() + "_save_prof"] = "(@{pb})";
            });
        }

        if (!looped) {
            callbacks.push(update_class);
        }
    };
    if (category === "Subclasses") {
        if (page.data.multiclass) {
            if (page.name && page.name !== "") { update[page.data.multiclass + "_subclass"] = page.name; }
            classlevel = parseInt(currentData[page.data.multiclass + "_lvl"]);
        } else {
            if (page.name && page.name !== "") { update["subclass"] = page.name; };
        }
        if (page.data["Spellcasting Ability"]) {
            if (page.data.Class == "Fighter") {
                update["arcane_fighter"] = "1";
            } else if (page.data.Class == "Rogue") {
                update["arcane_rogue"] = "1";
            }
        }
        if (!looped) {
            callbacks.push(update_class);
        };
    };
    if (category === "Races" || category === "Subraces") {
        update["tab"] = "core";
        if (category === "Races") {
            update["race"] = page.name;
            if (page.name == "Halfling") {
                update["halflingluck_flag"] = "1";
            }
        }
        else {
            update["subrace"] = page.name;
        };
        if (page.data["Speed"]) { update["speed"] = page.data["Speed"] };
        if (page.data["Size"]) { update["size"] = page.data["Size"] };
        if (!looped) {
            callbacks.push(update_race_display);
        }
    };
    if (category === "Backgrounds") {
        update["tab"] = "core";
        if (page.name && page.name !== "") { update["background"] = page.name; };
    };

    if (page.data.theseblobs) {
        _.each(page.data.theseblobs, function (blobname) {
            if (page.data.blobs[blobname]) blobs[blobname] = page.data.blobs[blobname];
        });
    } else {
        blobs = filterBlobs(page.data.blobs, { "Level": "1" });
    }
    _.each(blobs, function (blob, blobname) {
        if (blob["Traits"]) {
            var traitsource = "";
            switch (category) {
                case "Races":
                case "Subraces":
                    traitsource = "Racial";
                    break;
                case "Classes":
                case "Subclasses":
                    traitsource = "Class";
                    break;
                default:
                    traitsource = "Background";
            }
            var trait_array = jsonparse(blob["Traits"]);
            if (trait_array && trait_array.length) {
                _.each(trait_array, function (trait) {
                    if (!trait.Input) {
                        var match = { name: trait["Name"], type: page.name };
                        if (trait["Replace"]) {
                            match = { name: trait["Replace"] };
                        }
                        var existing = _.findWhere(repeating.traits, match);
                        if (existing) {
                            newrowid = existing.id;
                            existing.name = trait["Name"];
                            existing.source = traitsource;
                            existing.type = page.name;
                        } else {
                            var newtrait = {};
                            newrowid = generateRowID();
                            newtrait.id = newrowid;
                            newtrait.name = trait["Name"];
                            newtrait.source = traitsource;
                            newtrait.type = page.name;
                            repeating.traits.push(newtrait);
                        }
                        update["repeating_traits_" + newrowid + "_name"] = trait["Name"].replace(/{{Input}}/g, "");
                        update["repeating_traits_" + newrowid + "_description"] = trait["Desc"] ? trait["Desc"].replace(/{{Input}}/g, "") : "";
                        update["repeating_traits_" + newrowid + "_source"] = removeExpansionInfo(traitsource);
                        update["repeating_traits_" + newrowid + "_source_type"] = page.name ? removeExpansionInfo(page.name) : "";
                        update["repeating_traits_" + newrowid + "_options-flag"] = 0;
                        update["repeating_traits_" + newrowid + "_display_flag"] = "on";
                    }
                });
            };
        };
        if (blob["Language Proficiency"] || blob["Weapon Proficiency"] || blob["Armor Proficiency"] || blob["Tool Proficiency"]) {
            if (blob["Language Proficiency"]) {
                var lang_array = jsonparse(blob["Language Proficiency"]);
                if (lang_array["Proficiencies"] && lang_array["Proficiencies"].length) {
                    _.each(lang_array["Proficiencies"], function (prof) {
                        if (repeating.prof_names.indexOf(prof.toLowerCase()) == -1) {
                            newrowid = generateRowID();
                            update["repeating_proficiencies_" + newrowid + "_prof_type"] = "LANGUAGE";
                            update["repeating_proficiencies_" + newrowid + "_name"] = prof;
                            update["repeating_proficiencies_" + newrowid + "_options-flag"] = 0;
                            repeating.prof_names.push(prof.toLowerCase());
                        }
                    });
                }
            };
            if (blob["Weapon Proficiency"]) {
                var weap_array = jsonparse(blob["Weapon Proficiency"]);
                if (weap_array["Proficiencies"] && weap_array["Proficiencies"].length) {
                    _.each(weap_array["Proficiencies"], function (prof) {
                        if (repeating.prof_names.indexOf(prof.toLowerCase()) == -1) {
                            newrowid = generateRowID();
                            update["repeating_proficiencies_" + newrowid + "_prof_type"] = "WEAPON";
                            update["repeating_proficiencies_" + newrowid + "_name"] = prof;
                            update["repeating_proficiencies_" + newrowid + "_options-flag"] = 0;
                            repeating.prof_names.push(prof.toLowerCase());
                        }
                    });
                }
            };
            if (blob["Armor Proficiency"]) {
                var armor_array = jsonparse(blob["Armor Proficiency"]);
                if (armor_array["Proficiencies"] && armor_array["Proficiencies"].length) {
                    _.each(armor_array["Proficiencies"], function (prof) {
                        if (repeating.prof_names.indexOf(prof.toLowerCase()) == -1) {
                            newrowid = generateRowID();
                            update["repeating_proficiencies_" + newrowid + "_prof_type"] = "ARMOR";
                            update["repeating_proficiencies_" + newrowid + "_name"] = prof;
                            update["repeating_proficiencies_" + newrowid + "_options-flag"] = 0;
                            repeating.prof_names.push(prof.toLowerCase());
                        }
                    });
                }
            };
            if (blob["Tool Proficiency"]) {
                var tool_array = jsonparse(blob["Tool Proficiency"]);
                if (tool_array["Proficiencies"] && tool_array["Proficiencies"].length) {
                    _.each(tool_array["Proficiencies"], function (prof) {
                        //D&D 5e Mancer: Land Vehicles proficiency does not drop with Marine background (UC748)
                        //Generating ID that was coming empty for not existing rows.
                        //By Miguel Peres
                        let newrowid = generateRowID();

                        let existing = {};
                        _.each(repeating.tool, function (tool, id) {
                            if (tool.toolname == prof.toLowerCase()) {
                                newrowid = id;
                                existing = tool;
                            }
                        });
                        if (!existing.toolname) repeating.tool[newrowid] = { toolname: prof.toLowerCase() }
                        update["repeating_tool_" + newrowid + "_toolname"] = prof;
                        if (!existing.base) update["repeating_tool_" + newrowid + "_toolattr_base"] = "?{Attribute?|Strength,@{strength_mod}|Dexterity,@{dexterity_mod}|Constitution,@{constitution_mod}|Intelligence,@{intelligence_mod}|Wisdom,@{wisdom_mod}|Charisma,@{charisma_mod}}";
                        update["repeating_tool_" + newrowid + "_options-flag"] = 0;
                        repeating.prof_names.push(page.name.toLowerCase());
                        callbacks.push(function () { update_tool(newrowid); });
                    });
                }
            };
        };
        if (blob["Skill Proficiency"]) {
            var skill_array = jsonparse(blob["Skill Proficiency"]);
            if (skill_array["Proficiencies"] && skill_array["Proficiencies"].length) {
                _.each(skill_array["Proficiencies"], function (prof) {
                    var skill_string = prof.toLowerCase().replace(/ /g, '_');
                    update[skill_string + "_prof"] = "(@{pb}*@{" + skill_string + "_type})";
                });
            };
        };
        if (blob["Actions"]) {
            var actionsobj = {};
            jsonparse(blob["Actions"]).forEach(function (val) { actionsobj[val.Name] = val; });
            _.each(actionsobj, function (action, name) {
                newrowid = generateRowID();
                _.each(repeating.attack, function (atk, atkid) {
                    if (atk.atkname === name) newrowid = atkid;
                });
                update["repeating_attack_" + newrowid + "_options-flag"] = "0";
                update["repeating_attack_" + newrowid + "_atkname"] = name;
                if (action["Desc"]) {
                    update["repeating_attack_" + newrowid + "_atk_desc"] = action["Desc"];
                }

                if (action["Type Attack"]) {
                    if (action["Type"] == "Spell") {
                        update["repeating_attack_" + newrowid + "_atkflag"] = "0";
                        update["repeating_attack_" + newrowid + "_attack_options"] = "";
                        update["repeating_attack_" + newrowid + "_saveflag"] = "{{ save=1 }} {{ saveattr=@{saveattr}}} {{ savedesc=@{saveeffect}}} {{ savedc=[[[[@{savedc}]][SAVE]]]}}"
                    } else {
                        update["repeating_attack_" + newrowid + "_attack_flag"] = "on";
                        update["repeating_attack_" + newrowid + "_atkflag"] = "{{ attack=1 }}";
                        update["repeating_attack_" + newrowid + "_attack_options"] = "{{ attack=1 }}";
                    }
                    if (action["Reach"]) { update["repeating_attack_" + newrowid + "_atkrange"] = action["Reach"]; }

                    if (action["Damage"]) { update["repeating_attack_" + newrowid + "_dmgbase"] = action["Damage"]; }
                    if (action["Damage Type"]) { update["repeating_attack_" + newrowid + "_dmgtype"] = action["Damage Type"]; }
                    if (action["Modifier"]) {
                        update["repeating_attack_" + newrowid + "_dmgattr"] = modStringToAttrib(action["Modifier"]);
                        update["repeating_attack_" + newrowid + "_atkattr_base"] = modStringToAttrib(action["Modifier"]);
                    } else {
                        update["repeating_attack_" + newrowid + "_dmgattr"] = "0";
                    }
                    if (action["Save"]) { update["repeating_attack_" + newrowid + "_saveattr"] = action["Save"] }
                    if (action["Save DC"]) { update["repeating_attack_" + newrowid + "_savedc"] = "(" + modStringToAttrib(action["Save DC"]) + "+8+@{pb})" }
                    if (action["Save Effect"]) { update["repeating_attack_" + newrowid + "_saveeffect"] = action["Save Effect"] }

                    if (action["Damage 2"] && action["Damage 2 Type"]) {
                        update["repeating_attack_" + newrowid + "_dmg2flag"] = "{{damage=1}} {{dmg2flag=1}}";
                        update["repeating_attack_" + newrowid + "_atk_dmg2base"] = action["Damage 2"];
                        update["repeating_attack_" + newrowid + "_attack_damagetype2"] = action["Damage 2 Type"];
                        if (action["Modifier 2"]) {
                            update["repeating_attack_" + newrowid + "_dmg2attr"] = modStringToAttrib(action["Modifier 2"]);
                        } else {
                            update["repeating_attack_" + newrowid + "_dmgattr"] = "0";
                        }
                    }
                }
            });
        };
        if (blob["Global Damage"]) {
            var dmgmod = jsonparse(blob["Global Damage"]);
            var id = generateRowID();
            _.each(repeating.damagemod, function (name, rowid) {
                if (name.toLowerCase() === dmgmod["Name"].toLowerCase()) id = rowid;
            });
            update["repeating_damagemod_" + id + "_global_damage_name"] = `${dmgmod["Name"]}`;
            update["repeating_damagemod_" + id + "_global_damage_damage"] = `${parseValues(dmgmod["Damage"])}`;
            if (dmgmod["Active"] == "true") update["repeating_damagemod_" + id + "_global_damage_active_flag"] = "1";
            update["repeating_damagemod_" + id + "_options-flag"] = "0";
            update["repeating_damagemod_" + id + "_global_damage_type"] = dmgmod["Type"] ? dmgmod["Type"] : dmgmod["Name"];
            update["global_damage_mod_flag"] = "1";
            repeating.damagemod[id] = dmgmod["Name"];
        };
        if (blob["Resources"]) {
            var resources = jsonparse(blob["Resources"]);
            _.each(resources, function (value) {
                var section = "";
                if (currentData["class_resource_name"] == "" || currentData["class_resource_name"] == value["Name"]) {
                    section = "class_resource";
                } else if (currentData["other_resource_name"] == "" || currentData["other_resource_name"] == value["Name"]) {
                    section = "other_resource";
                } else {
                    _.each(repeating.resource, function (resource, id) {
                        if (resource.left == "" && section == "" || resource.left == value["Name"]) {
                            section = "repeating_resource_" + id + "_resource_left";
                        }
                        if (resource.right == "" && section == "" || resource.right == value["Name"]) {
                            section = "repeating_resource_" + id + "_resource_right";
                        }
                    })
                }
                if (section === "") {
                    var id = generateRowID();
                    section = "repeating_resource_" + id + "_resource_left";
                    repeating.resource[id] = { left: value["Name"], right: "" };
                }
                update[section + "_name"] = value["Name"];
                if (value["Uses"]) update[section] = numUses(value["Uses"]);
                update[section + "_max"] = value["Max"] ? numUses(value["Max"]) : numUses(value["Uses"]);
            });
        };
        if (blob["Custom AC"]) {
            var customac = jsonparse(blob["Custom AC"]);
            update["custom_ac_flag"] = "1";
            update["custom_ac_base"] = customac.Base;
            update["custom_ac_part1"] = customac["Attribute 1"];
            update["custom_ac_part2"] = customac["Attribute 2"] ? customac["Attribute 2"] : "";
            update["custom_ac_shield"] = customac.Shields;
            if (!looped) {
                callbacks.push(function () { update_ac(); })
            }
        };
        if (blob["Hit Points Per Level"]) {
            var id = generateRowID();
            update["repeating_hpmod_" + id + "_mod"] = blob["Hit Points Per Level"];
            update["repeating_hpmod_" + id + "_source"] = page.name ? page.name : "Subclass";
            if (category === "Races" || category === "Subraces") {
                update["repeating_hpmod_" + id + "_levels"] = "total";
            } else {
                update["repeating_hpmod_" + id + "_levels"] = "base";
            }
        };
        if (blob["Global AC Mod"]) {
            var globalac = jsonparse(blob["Global AC Mod"]);
            var id = generateRowID();
            _.each(repeating.acmod, function (name, rowid) {
                if (name.toLowerCase() === globalac["Name"].toLowerCase()) id = rowid;
            });
            update["repeating_acmod_" + id + "_global_ac_val"] = globalac.Bonus;
            if (globalac["Active"] !== "false") update["repeating_acmod_" + id + "_global_ac_active_flag"] = "1";
            update["repeating_acmod_" + id + "_options-flag"] = "0";
            update["repeating_acmod_" + id + "_global_ac_name"] = globalac.Name;
            update["global_ac_mod_flag"] = "1";
        };
        if (blob["Global Save"]) {
            var globalsave = jsonparse(blob["Global Save Mod"]);
            var id = generateRowID();
            _.each(repeating.savemod, function (name, rowid) {
                if (name.toLowerCase() === globalsave["Name"].toLowerCase()) id = rowid;
            });
            update["repeating_savemod_" + id + "_global_save_roll"] = globalsave.Bonus;
            if (globalsave["Active"] !== "false") update["repeating_savemod_" + id + "_global_save_active_flag"] = "1";
            update["repeating_savemod_" + id + "_options-flag"] = "0";
            update["repeating_savemod_" + id + "_global_save_name"] = globalsave.Name;
            update["global_save_mod_flag"] = "1";
        }
        if (blob["Global Attack"]) {
            var globalattack = jsonparse(blob["Global Attack"]);
            var id = generateRowID();
            _.each(repeating.tohitmod, function (name, rowid) {
                if (name.toLowerCase() === globalattack["Name"].toLowerCase()) id = rowid;
            });
            update["repeating_tohitmod_" + id + "_global_attack_rollstring"] = `${globalattack["Bonus"]}[${globalattack["Name"]}]`;
            if (globalattack["Active"] !== "false") update["repeating_tohitmod_" + id + "_global_attack_active_flag"] = "1";
            update["repeating_tohitmod_" + id + "_options-flag"] = "0";
            update["global_attack_mod_flag"] = "1";
        };
        if (blob["Initiative"]) {
            if (blob["Initiative"].toLowerCase() === "advantage") {
                update["initiative_style"] = "{@{d20},@{d20}}kh1";
            } else if (blob["Initiative"].toLowerCase() === "disadvantage") {
                update["initiative_style"] = "{@{d20},@{d20}}kl1";
            } else {
                update.initmod = numUses(blob["Initiative"]);
            }
        };
        if (blob["Carry Multiplier"]) {
            update["carrying_capacity_mod"] = "*" + blob["Carry Multiplier"];
        };
        if (blob["Speed"]) {
            if (blob["Speed"][0] === "+") {
                let prevspeed = update["speed"] || currentData["speed"];
                prevspeed = prevspeed && !isNaN(parseInt(prevspeed)) ? parseInt(prevspeed) : 0;
                update["speed"] = prevspeed + parseInt(blob["Speed"]);
            } else {
                update["speed"] = parseInt(blob["Speed"]);
            }
        };
        if (blob["Jack of All Trades"]) {
            update["jack_of_all_trades"] = "@{jack}";
        };
        if (blob["Saving Throws"]) {
            var saves = jsonparse(blob["Saving Throws"]);
            _.each(saves, function (value) {
                update[value.toLowerCase() + "_save_prof"] = "(@{pb})";
            });
        };
        if (blob["Custom Spells"]) {
            let spells = jsonparse(blob["Custom Spells"]);
            _.each(spells, function (spell) {
                var lvl = spell["Level"] && spell["Level"] > 0 ? spell["Level"] : "cantrip";
                let id = generateRowID();
                if (repeating["spell-" + lvl]) {
                    _.each(repeating["spell-" + lvl], function (spell, spellid) {
                        if (spell.spellname.toLowerCase() === page.name.toLowerCase()) {
                            id = spellid;
                        }
                    });
                }
                update["repeating_spell-" + lvl + "_" + id + "_spelllevel"] = lvl;
                if (spell["spellcasting_ability"]) {
                    update["repeating_spell-" + lvl + "_" + id + "_spell_ability"] = "@{" + spell["spellcasting_ability"].toLowerCase() + "_mod}+";;
                } else {
                    update["repeating_spell-" + lvl + "_" + id + "_spell_ability"] = "spell";
                }
                if (spell["spellclass"]) {
                    update["repeating_spell-" + lvl + "_" + id + "_spellclass"] = spell["spellclass"];
                }
                if (spell["spellsource"]) {
                    update["repeating_spell-" + lvl + "_" + id + "_spellsource"] = spell["spellsource"];
                }
                update["repeating_spell-" + lvl + "_" + id + "_spellname"] = spell.Name;
                if (spell["Ritual"]) { update["repeating_spell-" + lvl + "_" + id + "_spellritual"] = "{{ritual=1}}" };
                if (spell["School"]) { update["repeating_spell-" + lvl + "_" + id + "_spellschool"] = spell["School"].toLowerCase() };
                if (spell["Casting Time"]) { update["repeating_spell-" + lvl + "_" + id + "_spellcastingtime"] = spell["Casting Time"] };
                if (spell["Range"]) { update["repeating_spell-" + lvl + "_" + id + "_spellrange"] = spell["Range"] };
                if (spell["Target"]) { update["repeating_spell-" + lvl + "_" + id + "_spelltarget"] = spell["Target"] };
                if (spell["Components"]) {
                    if (spell["Components"].toLowerCase().indexOf("v") === -1) { update["repeating_spell-" + lvl + "_" + id + "_spellcomp_v"] = "0" };
                    if (spell["Components"].toLowerCase().indexOf("s") === -1) { update["repeating_spell-" + lvl + "_" + id + "_spellcomp_s"] = "0" };
                    if (spell["Components"].toLowerCase().indexOf("m") === -1) { update["repeating_spell-" + lvl + "_" + id + "_spellcomp_m"] = "0" };
                };
                if (spell["Material"]) { update["repeating_spell-" + lvl + "_" + id + "_spellcomp_materials"] = spell["Material"] };
                if (spell["Concentration"]) { update["repeating_spell-" + lvl + "_" + id + "_spellconcentration"] = "{{concentration=1}}" };
                if (spell["Duration"]) { update["repeating_spell-" + lvl + "_" + id + "_spellduration"] = spell["Duration"] };
                if (spell["Damage"] || spell["Healing"]) {
                    update["repeating_spell-" + lvl + "_" + id + "_spelloutput"] = "ATTACK";
                    callbacks.push(function () { create_attack_from_spell(lvl, id, currentData.character_id); });
                }
                else if (spell["Higher Spell Slot Desc"] && spell["Higher Spell Slot Desc"] != "") {
                    var spelllevel = "?{Cast at what level?";
                    for (i = 0; i < 10 - lvl; i++) {
                        spelllevel = spelllevel + "|Level " + (parseInt(i, 10) + parseInt(lvl, 10)) + "," + (parseInt(i, 10) + parseInt(lvl, 10));
                    }
                    spelllevel = spelllevel + "}";
                    update["repeating_spell-" + lvl + "_" + id + "_rollcontent"] = `@{wtype}&{template: spell} {{ level=@{spellschool} ${spelllevel}}} {{ name=@{spellname}}} {{ castingtime=@{spellcastingtime}}} {{ range=@{spellrange}}} {{ target=@{spelltarget}}} @{spellcomp_v} @{spellcomp_s} @{spellcomp_m} {{ material=@{spellcomp_materials}}} {{ duration=@{spellduration}}} {{ description=@{spelldescription}}} {{ athigherlevels=@{spellathigherlevels}}} @{spellritual} {{ innate=@{innate}}} @{spellconcentration} @{charname_output} {{ licensedsheet=@{licensedsheet}}}`;
                };
                if (spell["Spell Attack"]) { update["repeating_spell-" + lvl + "_" + id + "_spellattack"] = spell["Spell Attack"] };
                if (spell["Damage"]) { update["repeating_spell-" + lvl + "_" + id + "_spelldamage"] = spell["Damage"] };
                if (spell["Damage Type"]) { update["repeating_spell-" + lvl + "_" + id + "_spelldamagetype"] = spell["Damage Type"] };
                if (spell["Secondary Damage"]) { update["repeating_spell-" + lvl + "_" + id + "_spelldamage2"] = spell["Secondary Damage"] };
                if (spell["Secondary Damage Type"]) { update["repeating_spell-" + lvl + "_" + id + "_spelldamagetype2"] = spell["Secondary Damage Type"] };
                if (spell["Healing"]) { update["repeating_spell-" + lvl + "_" + id + "_spellhealing"] = spell["Healing"]; };
                if (spell["Add Casting Modifier"]) { update["repeating_spell-" + lvl + "_" + id + "_spelldmgmod"] = spell["Add Casting Modifier"] };
                if (spell["Save"]) { update["repeating_spell-" + lvl + "_" + id + "_spellsave"] = spell["Save"] };
                if (spell["Save Success"]) { update["repeating_spell-" + lvl + "_" + id + "_spellsavesuccess"] = spell["Save Success"] };
                if (spell["Higher Spell Slot Dice"]) { update["repeating_spell-" + lvl + "_" + id + "_spellhldie"] = spell["Higher Spell Slot Dice"] };
                if (spell["Higher Spell Slot Die"]) { update["repeating_spell-" + lvl + "_" + id + "_spellhldietype"] = spell["Higher Spell Slot Die"] };
                if (spell["Higher Spell Slot Bonus"]) { update["repeating_spell-" + lvl + "_" + id + "_spellhlbonus"] = spell["Higher Spell Slot Bonus"] };
                if (spell["Higher Spell Slot Desc"]) { update["repeating_spell-" + lvl + "_" + id + "_spellathigherlevels"] = spell["Higher Spell Slot Desc"] };
                if (spell["data-Cantrip Scaling"] && lvl == "cantrip") { update["repeating_spell-" + lvl + "_" + id + "_spell_damage_progression"] = "Cantrip " + spell["data-Cantrip Scaling"].charAt(0).toUpperCase() + spell["data-Cantrip Scaling"].slice(1); };
                if (spell["data-description"]) { update["repeating_spell-" + lvl + "_" + id + "_spelldescription"] = spell["data-description"] };
                update["repeating_spell-" + lvl + "_" + id + "_options-flag"] = "0";
            })
        };
        if (blob["Global Save Mod"]) {
            update["globalsavemod"] = numUses(blob["Global Save Mod"]);
        };
        if (blob["Proficiency Bonus"]) {
            var bonus = jsonparse(blob["Proficiency Bonus"]);
            _.each(bonus, function (value, prof) {
                update[prof.replace(/ /g, "_").toLowerCase() + "_flat"] = numUses(value);
            });
        };
        /**/
    });

    return {
        update: update,
        repeating: repeating,
        callbacks: callbacks
    };
};

var check_itemmodifiers = function (modifiers, previousValue) {
    var mods = modifiers.toLowerCase().split(",");
    if (previousValue) {
        prevmods = previousValue.toLowerCase().split(",");
        mods = _.union(mods, prevmods);
    };
    _.each(mods, function (mod) {
        if (mod.indexOf("ac:") > -1 || mod.indexOf("ac +") > -1 || mod.indexOf("ac -") > -1) { update_ac(); };
        if (mod.indexOf("spell") > -1) { update_spell_info(); };
        if (mod.indexOf("saving throws") > -1) { update_all_saves(); };
        if (mod.indexOf("strength save") > -1) { update_save("strength"); } else if (mod.indexOf("strength") > -1) { update_attr("strength"); };
        if (mod.indexOf("dexterity save") > -1) { update_save("dexterity"); } else if (mod.indexOf("dexterity") > -1) { update_attr("dexterity"); };
        if (mod.indexOf("constitution save") > -1) { update_save("constitution"); } else if (mod.indexOf("constitution") > -1) { update_attr("constitution"); };
        if (mod.indexOf("intelligence save") > -1) { update_save("intelligence"); } else if (mod.indexOf("intelligence") > -1) { update_attr("intelligence"); };
        if (mod.indexOf("wisdom save") > -1) { update_save("wisdom"); } else if (mod.indexOf("wisdom") > -1) { update_attr("wisdom"); };
        if (mod.indexOf("charisma save") > -1) { update_save("charisma"); } else if (mod.indexOf("charisma") > -1) { update_attr("charisma"); };
        if (mod.indexOf("ability checks") > -1) { update_all_ability_checks(); };
        if (mod.indexOf("acrobatics") > -1) { update_skills(["acrobatics"]); };
        if (mod.indexOf("animal handling") > -1) { update_skills(["animal_handling"]); };
        if (mod.indexOf("arcana") > -1) { update_skills(["arcana"]); };
        if (mod.indexOf("athletics") > -1) { update_skills(["athletics"]); };
        if (mod.indexOf("deception") > -1) { update_skills(["deception"]); };
        if (mod.indexOf("history") > -1) { update_skills(["history"]); };
        if (mod.indexOf("insight") > -1) { update_skills(["insight"]); };
        if (mod.indexOf("intimidation") > -1) { update_skills(["intimidation"]); };
        if (mod.indexOf("investigation") > -1) { update_skills(["investigation"]); };
        if (mod.indexOf("medicine") > -1) { update_skills(["medicine"]); };
        if (mod.indexOf("nature") > -1) { update_skills(["nature"]); };
        if (mod.indexOf("perception") > -1) { update_skills(["perception"]); };
        if (mod.indexOf("performance") > -1) { update_skills(["performance"]); };
        if (mod.indexOf("persuasion") > -1) { update_skills(["persuasion"]); };
        if (mod.indexOf("religion") > -1) { update_skills(["religion"]); };
        if (mod.indexOf("sleight of hand") > -1) { update_skills(["sleight_of_hand"]); };
        if (mod.indexOf("stealth") > -1) { update_skills(["stealth"]); };
        if (mod.indexOf("survival") > -1) { update_skills(["survival"]); };
    });
};

var create_attack_from_item = function (itemid, options) {
    var update = {};
    var newrowid = generateRowID();
    update["repeating_inventory_" + itemid + "_itemattackid"] = newrowid;
    if (options && options.versatile) {
        var newrowid2 = generateRowID();
        update["repeating_inventory_" + itemid + "_itemattackid"] += "," + newrowid2;
        setAttrs(update, {}, function () {
            update_attack_from_item(itemid, newrowid, { newattack: true, versatile: "primary" });
            update_attack_from_item(itemid, newrowid2, { newattack: true, versatile: "secondary" });
        });
    }
    else {
        setAttrs(update, {}, update_attack_from_item(itemid, newrowid, { newattack: true }));
    }
};

var update_attack_from_item = function (itemid, attackid, options) {
    getAttrs(["repeating_inventory_" + itemid + "_itemname", "repeating_inventory_" + itemid + "_itemproperties", "repeating_inventory_" + itemid + "_itemmodifiers", "strength", "dexterity"], function (v) {
        var update = {}; var itemtype; var damage; var damagetype; var damage2; var damagetype2; var attackmod; var damagemod; var range;
        var alt = {};

        if (options && options.newattack) {
            update["repeating_attack_" + attackid + "_options-flag"] = "0";
            update["repeating_attack_" + attackid + "_itemid"] = itemid;
        }

        if (v["repeating_inventory_" + itemid + "_itemmodifiers"] && v["repeating_inventory_" + itemid + "_itemmodifiers"] != "") {
            var mods = v["repeating_inventory_" + itemid + "_itemmodifiers"].split(",");
            _.each(mods, function (mod) {
                if (mod.indexOf("Item Type:") > -1) { itemtype = mod.split(":")[1].trim() }
                else if (mod.indexOf("Alternate Secondary Damage Type:") > -1) { alt.damagetype2 = mod.split(":")[1].trim(); }
                else if (mod.indexOf("Alternate Secondary Damage:") > -1) { alt.damage2 = mod.split(":")[1].trim(); }
                else if (mod.indexOf("Alternate Damage Type:") > -1) { alt.damagetype = mod.split(":")[1].trim(); }
                else if (mod.indexOf("Alternate Damage:") > -1) { alt.damage = mod.split(":")[1].trim(); }
                else if (mod.indexOf("Secondary Damage Type:") > -1) { damagetype2 = mod.split(":")[1].trim() }
                else if (mod.indexOf("Secondary Damage:") > -1) { damage2 = mod.split(":")[1].trim() }
                else if (mod.indexOf("Damage Type:") > -1) { damagetype = mod.split(":")[1].trim() }
                else if (mod.indexOf("Damage:") > -1) { damage = mod.split(":")[1].trim() }
                else if (mod.indexOf("Range:") > -1) { range = mod.split(":")[1].trim() }
                else if (mod.indexOf(" Attacks ") > -1) { attackmod = mod.split(" Attacks ")[1].trim() }
                else if (mod.indexOf(" Damage ") > -1) { damagemod = mod.split(" Damage ")[1].trim() }
            });
        }

        if (v["repeating_inventory_" + itemid + "_itemname"] && v["repeating_inventory_" + itemid + "_itemname"] != "") {
            update["repeating_attack_" + attackid + "_atkname"] = v["repeating_inventory_" + itemid + "_itemname"];
            if (options && options.versatile === "primary") {
                update["repeating_attack_" + attackid + "_atkname"] += " (One-Handed)";
            } else if (options && options.versatile === "secondary") {
                update["repeating_attack_" + attackid + "_atkname"] += " (Two-Handed)";
            }
        }
        if (options && options.versatile === "secondary") {
            if (alt.damage) {
                update["repeating_attack_" + attackid + "_dmgbase"] = alt.damage;
            }
            if (alt.damagetype) {
                update["repeating_attack_" + attackid + "_dmgtype"] = alt.damagetype;
            }
            if (alt.damage2) {
                update["repeating_attack_" + attackid + "_dmg2base"] = alt.damage2;
                update["repeating_attack_" + attackid + "_dmg2attr"] = 0;
                update["repeating_attack_" + attackid + "_dmg2flag"] = "{{damage=1}} {{dmg2flag=1}}";
            }
            if (alt.damagetype2) {
                update["repeating_attack_" + attackid + "_dmg2type"] = alt.damagetype2;
            }
            update["repeating_attack_" + attackid + "_versatile_alt"] = "1";
        }
        else {
            if (damage) {
                update["repeating_attack_" + attackid + "_dmgbase"] = damage;
            }
            if (damagetype) {
                update["repeating_attack_" + attackid + "_dmgtype"] = damagetype;
            }
            if (damage2) {
                update["repeating_attack_" + attackid + "_dmg2base"] = damage2;
                update["repeating_attack_" + attackid + "_dmg2attr"] = 0;
                update["repeating_attack_" + attackid + "_dmg2flag"] = "{{damage=1}} {{dmg2flag=1}}";
            }
            if (damagetype2) {
                update["repeating_attack_" + attackid + "_dmg2type"] = damagetype2;
            }
        }
        if (range) {
            update["repeating_attack_" + attackid + "_atkrange"] = range;
        }
        var finesse = v["repeating_inventory_" + itemid + "_itemproperties"] && /finesse/i.test(v["repeating_inventory_" + itemid + "_itemproperties"]);
        if ((itemtype && itemtype.indexOf("Ranged") > -1) || (finesse && +v.dexterity > +v.strength)) {
            update["repeating_attack_" + attackid + "_atkattr_base"] = "@{dexterity_mod}";
            update["repeating_attack_" + attackid + "_dmgattr"] = "@{dexterity_mod}";
        }
        else {
            update["repeating_attack_" + attackid + "_atkattr_base"] = "@{strength_mod}";
            update["repeating_attack_" + attackid + "_dmgattr"] = "@{strength_mod}";
        }
        if (attackmod && damagemod && attackmod == damagemod) {
            update["repeating_attack_" + attackid + "_atkmagic"] = parseInt(attackmod, 10);
            update["repeating_attack_" + attackid + "_atkmod"] = "";
            update["repeating_attack_" + attackid + "_dmgmod"] = "";
        }
        else {
            if (attackmod) {
                update["repeating_attack_" + attackid + "_atkmod"] = parseInt(attackmod, 10);
            }
            if (damagemod) {
                update["repeating_attack_" + attackid + "_dmgmod"] = parseInt(damagemod, 10);
            }
            update["repeating_attack_" + attackid + "_atkmagic"] = "";
        }
        var callback = function () { update_attacks(attackid, "item") };
        setAttrs(update, { silent: true }, callback);
    });
};

const create_resource_from_item = (itemid) => {
    const newrowid = generateRowID();
    let update = {};

    getAttrs(["other_resource_name"], (v) => {
        //Use other_resource if it is empty
        if (!v.other_resource_name || v.other_resource_name == "") {
            update[`repeating_inventory_${itemid}_itemresourceid`] = "other_resource";
            setAttrs(update, {}, update_resource_from_item(itemid, "other_resource", true));
            //If other_resource is populated look through the repeating sections for an empty spot
        } else {
            getSectionIDs(`repeating_resource`, (idarray) => {
                if (idarray.length == 0) {
                    update[`repeating_inventory_${itemid}_itemresourceid`] = `${newrowid}_resource_left`;
                    setAttrs(update, {}, update_resource_from_item(itemid, `${newrowid}_resource_left`, true));
                } else {
                    let array = [];
                    _.each(idarray, (currentID, i) => {
                        ["left", "right"].forEach(side => {
                            array.push(`repeating_resource_${currentID}_resource_${side}`);
                            array.push(`repeating_resource_${currentID}_resource_${side}_name`);
                            array.push(`repeating_resource_${currentID}_resource_${side}_max`);
                        });
                    });
                    getAttrs(array, (y) => {
                        let existing = false;
                        _.each(idarray, (currentID, i) => {
                            ["left", "right"].forEach(side => {
                                const Name = y[`repeating_resource_${currentID}_resource_${side}_name`] || false;
                                const Value = y[`repeating_resource_${currentID}_resource_${side}`] || false;
                                const Max = y[`repeating_resource_${currentID}_resource_${side}_max`] || false;

                                //If Name, Value, & Max are empty and existing === false then populate a resource there
                                if ((!Name && !Value && !Max) && existing === false) {
                                    update[`repeating_inventory_${itemid}_itemresourceid`] = `${currentID}_resource_${side}`;
                                    setAttrs(update, {}, update_resource_from_item(itemid, `${currentID}_resource_${side}`, true));
                                    existing = true;
                                };
                            });
                        });
                        //If nothing is empty then generatae a new row
                        if (!existing) {
                            update[`repeating_inventory_${itemid}_itemresourceid`] = `${newrowid}_resource_left`;
                            setAttrs(update, {}, update_resource_from_item(itemid, `${newrowid}_resource_left`, true));
                        };
                    });
                };
            });
        };
    });
};

var update_resource_from_item = function (itemid, resourceid, newresource) {
    getAttrs(["repeating_inventory_" + itemid + "_itemname", "repeating_inventory_" + itemid + "_itemcount"], function (v) {
        var update = {}; var id;

        if (resourceid && resourceid == "other_resource") {
            id = resourceid;
        }
        else {
            id = "repeating_resource_" + resourceid;
        };

        if (newresource) {
            update[id + "_itemid"] = itemid;
        };

        if (!v["repeating_inventory_" + itemid + "_itemname"]) {
            update["repeating_inventory_" + itemid + "_useasresource"] = 0;
            update["repeating_inventory_" + itemid + "_itemresourceid"] = "";
            remove_resource(resourceid);
        };
        if (v["repeating_inventory_" + itemid + "_itemname"] && v["repeating_inventory_" + itemid + "_itemname"] != "") {
            update[id + "_name"] = v["repeating_inventory_" + itemid + "_itemname"];
        };
        if (v["repeating_inventory_" + itemid + "_itemcount"] && v["repeating_inventory_" + itemid + "_itemcount"] != "") {
            update[id] = v["repeating_inventory_" + itemid + "_itemcount"];
        };

        setAttrs(update, { silent: true });

    });
};


const create_attack_from_spell = function (lvl, spellid, character_id) {
    let update = {};
    const newrowid = generateRowID();
    update[`repeating_spell-${lvl}_${spellid}_spellattackid`] = newrowid;
    update[`repeating_spell-${lvl}_${spellid}_rollcontent`] = `%{${character_id}|repeating_attack_${newrowid}_attack}`;
    setAttrs(update, {}, update_attack_from_spell(lvl, spellid, newrowid, true));
}

const update_attack_from_spell = (lvl, spellid, attackid, newattack) => {
    const repeating_spell = `repeating_spell-${lvl}_${spellid}`;
    const repeating_attack = `repeating_attack_${attackid}`;
    getAttrs([`${repeating_spell}_spellname`, `${repeating_spell}_spellrange`, `${repeating_spell}_spelltarget`, `${repeating_spell}_spellattack`, `${repeating_spell}_spelldamage`, `${repeating_spell}_spelldamage2`, `${repeating_spell}_spelldamagetype`, `${repeating_spell}_spelldamagetype2`, `${repeating_spell}_spellhealing`, `${repeating_spell}_spelldmgmod`, `${repeating_spell}_spellsave`, `${repeating_spell}_spellsavesuccess`, `${repeating_spell}_spellhldie`, `${repeating_spell}_spellhldietype`, `${repeating_spell}_spellhlbonus`, `${repeating_spell}_spelllevel`, `${repeating_spell}_includedesc`, `${repeating_spell}_spelldescription`, `${repeating_spell}_spellathigherlevels`, `${repeating_spell}_spell_damage_progression`, `${repeating_spell}_innate`, `${repeating_spell}_spell_ability`, "spellcasting_ability"], (v) => {
        let update = {};
        let description = "";
        const spellAbility = (v[`${repeating_spell}_spell_ability`] != "spell") ? v[`${repeating_spell}_spell_ability`].slice(0, -1) : "spell";
        update[`${repeating_attack}_atkattr_base`] = spellAbility;

        if (newattack) {
            update[`${repeating_attack}_options-flag`] = "0";
            update[`${repeating_attack}_spellid`] = spellid;
            update[`${repeating_attack}_spelllevel`] = lvl;
        }

        if (v[`${repeating_spell}_spell_ability`] == "spell") {
            update[`${repeating_attack}_savedc`] = "(@{spell_save_dc})";
        } else if (v[`${repeating_spell}_spell_ability`]) {
            update[`${repeating_attack}_savedc`] = `(${spellAbility}+8+@{spell_dc_mod}+@{pb})`;
        }

        if (v[`${repeating_spell}_spellname`] && v[`${repeating_spell}_spellname`] != "") {
            update[`${repeating_attack}_atkname`] = v[`${repeating_spell}_spellname`];
        }

        update[`${repeating_attack}_atkflag`] = (!v[`${repeating_spell}_spellattack`] || v[`${repeating_spell}_spellattack`] === "None") ? "0" : "{{ attack=1 }}";

        if (v[`${repeating_spell}_spellattack`] || !v[`${repeating_spell}_spellattack`] === "None") {
            description = description + v[`${repeating_spell}_spellattack`] + " Spell Attack. ";
        };

        if (v[`${repeating_spell}_spelldamage`] && v[`${repeating_spell}_spelldamage`] != "") {
            update[`${repeating_attack}_dmgbase`] =
                (v[`${repeating_spell}_spell_damage_progression`] && v[`${repeating_spell}_spell_damage_progression`] === "Cantrip Dice") ? "[[round((@{level} + 1) / 6 + 0.5)]]" + v[`${repeating_spell}_spelldamage`].substring(1) :
                    v[`${repeating_spell}_spelldamage`];
        };

        update[`${repeating_attack}_dmgflag`] = (v[`${repeating_spell}_spelldamage`] && v[`${repeating_spell}_spelldamage`] != "") ? "{{ damage=1 }} {{ dmg1flag=1 }}" : "0";
        update[`${repeating_attack}_dmgattr`] = (v[`${repeating_spell}_spelldmgmod`] && v[`${repeating_spell}_spelldmgmod`] === "Yes") ? spellAbility : "0";
        update[`${repeating_attack}_dmgtype`] = (v[`${repeating_spell}_spelldamagetype`]) ? v[`${repeating_spell}_spelldamagetype`] : "";
        update[`${repeating_attack}_dmg2base`] = (v[`${repeating_spell}_spelldamage2`]) ? v[`${repeating_spell}_spelldamage2`] : "";
        update[`${repeating_attack}_dmg2attr`] = "0";
        update[`${repeating_attack}_dmg2flag`] = (v[`${repeating_spell}_spelldamage2`]) ? "{{ damage=1 }} {{ dmg2flag=1 }}" : 0;
        update[`${repeating_attack}_dmg2type`] = (v[`${repeating_spell}_spelldamagetype2`]) ? v[`${repeating_spell}_spelldamagetype2`] : "";
        update[`${repeating_attack}_atkrange`] = (v[`${repeating_spell}_spellrange`]) ? v[`${repeating_spell}_spellrange`] : "";
        update[`${repeating_attack}_saveflag`] = (v[`${repeating_spell}_spellsave`]) ? "{{ save=1 }} {{ saveattr=@{saveattr}}} {{ savedesc=@{saveeffect}}} {{ savedc=[[[[@{savedc}]][SAVE]]]}}" : "0";
        update[`${repeating_attack}_saveeffect`] = (v[`${repeating_spell}_spellsavesuccess`]) ? v[`${repeating_spell}_spellsavesuccess`] : "";

        if (v[`${repeating_spell}_spellsave`]) {
            update[`${repeating_attack}_saveattr`] = v[`${repeating_spell}_spellsave`];
        };

        if (v[`${repeating_spell}_spellhldie`] && v[`${repeating_spell}_spellhldie`] != "" && v[`${repeating_spell}_spellhldietype`] && v[`${repeating_spell}_spellhldietype`] != "") {
            let bonus = "";
            const spelllevel = v[`${repeating_spell}_spelllevel`];
            let query = "?{Cast at what level?";
            for (i = 0; i < 10 - spelllevel; i++) {
                query = query + "|Level " + (parseInt(i, 10) + parseInt(spelllevel, 10)) + "," + i;
            }
            query = query + "}";
            if (v[`${repeating_spell}_spellhlbonus`] && v[`${repeating_spell}_spellhlbonus`] != "") {
                bonus = "+(" + v[`${repeating_spell}_spellhlbonus`] + "*" + query + ")";
            }
            update[`${repeating_attack}_hldmg`] = `{{ hldmg=[[(${v[`${repeating_spell}_spellhldie`]} * ${query})${v[`${repeating_spell}_spellhldietype`]}${bonus}]]}}`;
        } else {
            update[`${repeating_attack}_hldmg`] = "";
        }

        if (v[`${repeating_spell}_spellhealing`] && v[`${repeating_spell}_spellhealing`] != "") {
            if (!v[`${repeating_spell}_spelldamage`] || v[`${repeating_spell}_spelldamage`] === "") {
                update[`${repeating_attack}_dmgbase`] = v[`${repeating_spell}_spellhealing`];
                update[`${repeating_attack}_dmgflag`] = "{{ damage=1 }} {{ dmg1flag=1 }}";
                update[`${repeating_attack}_dmgtype`] = "Healing";
            } else if (!v[`${repeating_spell}_spelldamage2`] || v[`${repeating_spell}_spelldamage2`] === "") {
                update[`${repeating_attack}_dmg2base`] = v[`${repeating_spell}_spellhealing`];
                update[`${repeating_attack}_dmg2flag`] = "{{ damage=1 }} {{ dmg2flag=1 }}";
                update[`${repeating_attack}_dmg2type`] = "Healing";
            }
        }

        update[`${repeating_attack}_spell_innate`] = (v[`${repeating_spell}_innate`]) ? v[`${repeating_spell}_innate`] : "";

        if (v[`${repeating_spell}_spelltarget`]) {
            description = description + v[`${repeating_spell}_spelltarget`] + ". ";
        }
        if (v[`${repeating_spell}_includedesc`] && v[`${repeating_spell}_includedesc`] === "on") {
            description = v[`${repeating_spell}_spelldescription`];
            if (v[`${repeating_spell}_spellathigherlevels`] && v[`${repeating_spell}_spellathigherlevels`] != "") {
                description = description + "\n\nAt Higher Levels: " + v[`${repeating_spell}_spellathigherlevels`];
            }
        } else if (v[`${repeating_spell}_includedesc`] && v[`${repeating_spell}_includedesc`] === "off") {
            description = "";
        };
        update[`${repeating_attack}_atk_desc`] = description;

        var callback = () => { update_attacks(attackid, "spell") };
        setAttrs(update, { silent: true }, callback);
    });
};

const update_attacks = (update_id, source) => {
    if (update_id.substring(0, 1) === "-" && update_id.length === 20) {
        do_update_attack([update_id], source);
    } else if (["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "spells", "all"].indexOf(update_id) > -1) {
        getSectionIDs("repeating_attack", (idarray) => {
            if (update_id === "all") {
                do_update_attack(idarray);
            } else if (update_id === "spells") {
                let attack_attribs = [];
                _.each(idarray, (id) => {
                    attack_attribs.push(`repeating_attack_${id}_spellid`, `repeating_attack_${id}_spelllevel`);
                });
                getAttrs(attack_attribs, (v) => {
                    const filteredIds = _.filter(idarray, (id) => {
                        return v[`repeating_attack_${id}_spellid`] && v[`repeating_attack_${id}_spellid`] != "";
                    });
                    let spell_attacks = {};
                    _.each(filteredIds, (attack_id) => {
                        spell_attacks[attack_id] = {
                            spell_id: v[`repeating_attack_${attack_id}_spellid`],
                            spell_lvl: v[`repeating_attack_${attack_id}_spelllevel`]
                        };
                    });
                    _.each(spell_attacks, (data, attack_id) => { update_attack_from_spell(data.spell_lvl, data.spell_id, attack_id); });
                });
            } else {
                let attack_attribs = ["spellcasting_ability"];
                _.each(idarray, (id) => {
                    attack_attribs.push(`repeating_attack_${id}_atkattr_base`);
                    attack_attribs.push(`repeating_attack_${id}_dmgattr`);
                    attack_attribs.push(`repeating_attack_${id}_dmg2attr`);
                    attack_attribs.push(`repeating_attack_${id}_savedc`);
                });
                getAttrs(attack_attribs, (v) => {
                    let attr_attack_ids = [];
                    _.each(idarray, (id) => {
                        if ((v[`repeating_attack_${id}_atkattr_base`] && v[`repeating_attack_${id}_atkattr_base`].indexOf(update_id) > -1) || (v[`repeating_attack_${id}_dmgattr`] && v[`repeating_attack_${id}_dmgattr`].indexOf(update_id) > -1) || (v[`repeating_attack_${id}_dmg2attr`] && v[`repeating_attack_${id}_dmg2attr`].indexOf(update_id) > -1) || (v[`repeating_attack_${id}_savedc`] && v[`repeating_attack_${id}_savedc`].indexOf(update_id) > -1) || (v[`repeating_attack_${id}_savedc`] && v[`repeating_attack_${id}_savedc`] === "(@{spell_save_dc})" && v["spellcasting_ability"] && v["spellcasting_ability"].indexOf(update_id) > -1)) {
                            attr_attack_ids.push(id);
                        }
                    });
                    if (attr_attack_ids.length > 0) {
                        do_update_attack(attr_attack_ids);
                    }
                });
            };
        });
    };
};

const do_update_attack = (attack_array, source) => {
    let attack_attribs = ["level", "d20", "pb", "pb_type", "pbd_safe", "dtype", "globalmagicmod", "strength_mod", "dexterity_mod", "constitution_mod", "intelligence_mod", "wisdom_mod", "charisma_mod", "spellcasting_ability", "spell_save_dc", "spell_attack_mod", "spell_dc_mod", "global_damage_mod_roll", "global_damage_mod_crit"];
    _.each(attack_array, (attackid) => {
        ["atkflag", "atkname", "atkattr_base", "atkmod", "atkprofflag", "atkmagic", "dmgflag", "dmgbase", "dmgattr", "dmgmod", "dmgtype", "dmg2flag", "dmg2base", "dmg2attr", "dmg2mod", "dmg2type", "dmgcustcrit", "dmg2custcrit", "saveflag", "savedc", "saveeffect", "saveflat", "hldmg", "spellid", "spelllevel", "atkrange", "itemid", "ammo",].forEach((attr) => {
            attack_attribs.push(`repeating_attack_${attackid}_${attr}`)
        });
    });

    getAttrs(attack_attribs, (v) => {
        _.each(attack_array, (attackid) => {
            const repeating_attack = `repeating_attack_${attackid}`;
            let callbacks = [];
            let update = {};
            let hbonus = "";
            let hdmg1 = "";
            let hdmg2 = "";
            let dmg = "";
            let dmg2 = "";
            let rollbase = "";
            let spellattack = false;
            let magicattackmod = 0;
            let magicsavemod = 0;
            let atkattr_abrev = "";
            let dmgattr_abrev = "";
            let dmg2attr_abrev = "";
            //PROFICIENCY BONUS select in Settings.
            const pbd_safe = v["pbd_safe"] || "";

            //HIGHER LVL CAST DMG found in Spells for spells like Fireball
            const hldmgcrit = (v[`${repeating_attack}_hldmg`] && v[`${repeating_attack}_hldmg`] != "") ? v[`${repeating_attack}_hldmg`].slice(0, 7) + "crit" + v[`${repeating_attack}_hldmg`].slice(7) : "";

            if (v[`${repeating_attack}_spellid`] && v[`${repeating_attack}_spellid`] != "") {
                spellattack = true;
                //GLOBAL MAGIC ATTACK MODIFIER in Settings
                magicattackmod = parseInt(v["spell_attack_mod"], 10) || 0;
                //SPELL SAVE DC MOD in Settings
                magicsavemod = parseInt(v["spell_dc_mod"], 10) || 0;
            };

            //ATTACK select inside settings for the repeating attack
            if (!v[`${repeating_attack}_atkattr_base`] || v[`${repeating_attack}_atkattr_base`] === "0") {
                atkattr_base = 0
            } else if (v[`${repeating_attack}_atkattr_base`] && v[`${repeating_attack}_atkattr_base`] === "spell") {
                atkattr_base = parseInt(v[v["spellcasting_ability"].substring(2, v["spellcasting_ability"].length - 2)], 10);
                atkattr_abrev = v["spellcasting_ability"].substring(2, 5).toUpperCase();
            } else {
                atkattr_base = parseInt(v[v[`${repeating_attack}_atkattr_base`].substring(2, v[`${repeating_attack}_atkattr_base`].length - 1)], 10);
                atkattr_abrev = v[`${repeating_attack}_atkattr_base`].substring(2, 5).toUpperCase();
            };

            //DAMAGE 1 ability select inside settings for the repeating attack
            if (!v[`${repeating_attack}_dmgattr`] || v[`${repeating_attack}_dmgattr`] === "0") {
                dmgattr = 0;
            } else if (v[`${repeating_attack}_dmgattr`] && v[`${repeating_attack}_dmgattr`] === "spell") {
                dmgattr = parseInt(v[v["spellcasting_ability"].substring(2, v["spellcasting_ability"].length - 2)], 10);
                dmgattr_abrev = v["spellcasting_ability"].substring(2, 5).toUpperCase();
            } else {
                dmgattr = parseInt(v[v[`${repeating_attack}_dmgattr`].substring(2, v[`${repeating_attack}_dmgattr`].length - 1)], 10);
                dmgattr_abrev = v[`${repeating_attack}_dmgattr`].substring(2, 5).toUpperCase();
            };

            //DAMAGE 2 ability select inside settings for the repeating attack
            if (!v[`${repeating_attack}_dmg2attr`] || v[`${repeating_attack}_dmg2attr`] === "0") {
                dmg2attr = 0;
            } else if (v[`${repeating_attack}_dmg2attr`] && v[`${repeating_attack}_dmg2attr`] === "spell") {
                dmg2attr = parseInt(v[v["spellcasting_ability"].substring(2, v["spellcasting_ability"].length - 2)], 10);
                dmg2attr_abrev = v["spellcasting_ability"].substring(2, 5).toUpperCase();
            } else {
                dmg2attr = parseInt(v[v[`${repeating_attack}_dmg2attr`].substring(2, v[`${repeating_attack}_dmg2attr`].length - 1)], 10);
                dmg2attr_abrev = v[`${repeating_attack}_dmg2attr`].substring(2, 5).toUpperCase();
            };

            //DAMAGE first input inside settings for the repeating attack
            const dmgbase = v[`${repeating_attack}_dmgbase`] || 0;
            const dmg2base = v[`${repeating_attack}_dmg2base`] || 0;
            //DAMAGE 1 second input inside settings for the repeating attack
            const dmgmod = parseInt(v[`${repeating_attack}_dmgmod`], 10) || 0;
            //DAMAGE 2 second input inside settings for the repeating attack
            const dmg2mod = parseInt(v[`${repeating_attack}_dmg2mod`], 10) || 0;
            //DAMAGE 1 TYPE input inside settings for the repeating attack
            const dmgtype = v[`${repeating_attack}_dmgtype`] || "";
            //DAMAGE 2 TYPE input inside settings for the repeating attack
            const dmg2type = v[`${repeating_attack}_dmg2type`] || "";

            //PROFICIENT flag inside settings for the repeating attack && PROFICIENCY BONUS from Settings
            const atkprofflag = v[`${repeating_attack}_atkprofflag`] || 0;
            const pb = (atkprofflag != 0 && v.pb) ? v.pb : 0;

            //ATTACK input inside settings for the repeating attack
            const atkmod = parseInt(v[`${repeating_attack}_atkmod`], 10) || 0;
            //MAGIC BONUS input inside settings for the repeating attack
            const atkmag = parseInt(v[`${repeating_attack}_atkmagic`], 10) || 0;

            //used in _atkdmgtype display
            const dmgmag = (isNaN(atkmag) === false && atkmag != 0 && ((v[`${repeating_attack}_dmgflag`] && v[`${repeating_attack}_dmgflag`] != 0) || (v[`${repeating_attack}_dmg2flag`] && v[`${repeating_attack}_dmg2flag`] != 0))) ? `+ ${atkmag} Magic Bonus` : "";

            //ATTACK checkbox inside settings for the repeating attack
            const atkflag = v[`${repeating_attack}_atkflag`] || 0;
            if (atkflag != 0) {
                bonus_mod = atkattr_base + atkmod + atkmag + magicattackmod;
                plus_minus = (bonus_mod > -1) ? "+" : "";
                //pb_type is PROFICIENCY BONUS select in Settings
                if (v["pb_type"] && v["pb_type"] === "die") {
                    bonus = `${bonus_mod}+${pb}`;
                } else {
                    bonus_mod = bonus_mod + parseInt(pb, 10);
                    bonus = plus_minus + bonus_mod;
                };
                //SAVING THROW checkbox inside settings for the repeating attack
            } else if (v[`${repeating_attack}_saveflag`] && v[`${repeating_attack}_saveflag`] != 0) {
                const saveDC = v[`${repeating_attack}_savedc`] || "";
                //SAVING THROW VS DC select "Spell" inside settings for the repeating attack
                if (!saveDC || saveDC === "(@{spell_save_dc})") {
                    const tempdc = v["spell_save_dc"];
                    bonus = "DC" + tempdc;
                    //SAVING THROW VS DC select "FLAT" inside settings for the repeating attack
                } else if (saveDC === "(@{saveflat})") {
                    const tempdc = parseInt(v[`${repeating_attack}_saveflat`]) || 0;
                    bonus = "DC" + tempdc;
                    //SAVING THROW VS DC select ability score inside settings for the repeating attack
                } else {
                    const savedcattr = v[`${repeating_attack}_savedc`].split("_mod")[0].slice(3);
                    const safe_pb = v["pb_type"] && v["pb_type"] === "die" ? parseInt(pb.substring(1), 10) / 2 : parseInt(pb, 10);
                    const safe_attr = v[`${savedcattr}_mod`] ? parseInt(v[`${savedcattr}_mod`], 10) : 0;
                    const tempdc = 8 + safe_attr + safe_pb + magicsavemod;
                    bonus = "DC" + tempdc;
                };
            } else {
                bonus = "-";
            }

            //DAMAGE checkbox inside settings for the repeating attack
            const dmgflag1 = v[`${repeating_attack}_dmgflag`] || 0;
            const dmgflag2 = v[`${repeating_attack}_dmg2flag`] || 0;
            if (dmgflag1 != 0) {
                if (spellattack === true && dmgbase.indexOf("[[round((@{level} + 1) / 6 + 0.5)]]") > -1) {
                    // SPECIAL CANTRIP DAMAGE
                    dmgdiestring = Math.round(((parseInt(v["level"], 10) + 1) / 6) + 0.5).toString();
                    dmg = dmgdiestring + dmgbase.substring(dmgbase.lastIndexOf("d"));
                    //select & input to the right of damage
                    if (dmgattr + dmgmod != 0) {
                        dmg += `+${(dmgattr + dmgmod)}`;
                    }
                    dmg += ` ${dmgtype}`;
                } else {
                    if (dmgbase === 0 && (dmgattr + dmgmod === 0)) {
                        dmg = 0;
                    }
                    if (dmgbase != 0) {
                        dmg = dmgbase;
                    }
                    if (dmgbase != 0 && (dmgattr + dmgmod != 0)) {
                        dmg = (dmgattr + dmgmod > 0) ? dmg + "+" : dmg;
                    }
                    if (dmgattr + dmgmod != 0) {
                        dmg = dmg + (dmgattr + dmgmod);
                    }
                    dmg = dmg + " " + dmgtype;
                }
            };
            if (dmgflag2 != 0) {
                if (dmg2base === 0 && (dmg2attr + dmg2mod === 0)) {
                    dmg2 = 0;
                }
                if (dmg2base != 0) {
                    dmg2 = dmg2base;
                }
                if (dmg2base != 0 && (dmg2attr + dmg2mod != 0)) {
                    dmg2 = (dmg2attr + dmg2mod > 0) ? dmg2 + "+" : dmg2;
                }
                if (dmg2attr + dmg2mod != 0) {
                    dmg2 = dmg2 + (dmg2attr + dmg2mod);
                }
                dmg2 = dmg2 + " " + dmg2type;
            };
            update[`${repeating_attack}_atkdmgtype`] = (dmgflag1 != 0 && dmgflag2 != 0) ? `${dmg} + ${dmg2}${dmgmag} ` : `${dmg}${dmg2}${dmgmag} `;

            //Build ROLL TEMPLATE with below variables
            //ATTACK checkbox inside settings for the repeating attack
            if (atkflag != 0) {
                if (atkattr_base != 0) { hbonus += ` + ${atkattr_base}[${atkattr_abrev}]` };
                if (atkmod != 0) { hbonus += ` + ${atkmod}[MOD]` };
                if (pb != 0) { hbonus += ` + ${pb}${pbd_safe}[PROF]` };
                if (atkmag != 0) { hbonus += ` + ${atkmag}[MAGIC]` };
                if (magicattackmod != 0) { hbonus += ` + ${magicattackmod}[SPELLATK]` };
            }
            //DAMAGE 1 checkbox inside settings for the repeating attack
            if (dmgflag1 != 0) {
                hdmg1 += dmgbase;
                if (dmgattr != 0) { hdmg1 += ` + ${dmgattr}[${dmgattr_abrev}]` };
                if (dmgmod != 0) { hdmg1 += ` + ${dmgmod}[MOD]` };
                if (atkmag != 0) { hdmg1 += ` + ${atkmag}[MAGIC]` };
            } else {
                hdmg1 += "0";
            }
            //DAMAGE 2 checkbox inside settings for the repeating attack
            if (dmgflag2 != 0) {
                hdmg2 += dmg2base
                if (dmg2attr != 0) { hdmg2 += ` + ${dmg2attr}[${dmg2attr_abrev}]` };
                if (dmg2mod != 0) { hdmg2 += ` + ${dmg2mod}[MOD]` };
            } else {
                hdmg2 += "0";
            }
            //CRIT input inside settings for the repeating attack
            let crit1 = v[`${repeating_attack}_dmgcustcrit`] || 0;
            let crit2 = v[`${repeating_attack}_dmg2custcrit`] || 0;
            crit1 = (crit1 != 0) ? v[`${repeating_attack}_dmgcustcrit`] : dmgbase;
            crit2 = (crit2 != 0) ? v[`${repeating_attack}_dmg2custcrit`] : dmg2base;
            r1 = (atkflag != 0) ? "@{d20}" : "0d20";
            r2 = (atkflag != 0) ? "@{rtype}" : "{{r2=[[0d20";
            //set in the GLOBAL DAMAGE MODIFIER section
            let globaldamage = `[[${v.global_damage_mod_roll || 0}]]`;
            let globaldamagecrit = `[[${v.global_damage_mod_crit || 0}]]`;

            //Assamble Roll Templates
            if (v.dtype === "full") {
                rollbase = `@{wtype}&{template:atkdmg} {{mod=@{atkbonus}}} {{rname=@{atkname}}} {{r1=[[${r1}cs>@{atkcritrange}${hbonus}]]}} ${r2}cs>@{atkcritrange}${hbonus}]]}} @{atkflag} {{range=@{atkrange}}} @{dmgflag} {{dmg1=[[${hdmg1}]]}} {{dmg1type=${dmgtype}}} @{dmg2flag} {{dmg2=[[${hdmg2}]]}} {{dmg2type=${dmg2type}}} {{crit1=[[${crit1}[CRIT]]]}} {{crit2=[[${crit2}[CRIT]]]}} @{saveflag} {{desc=@{atk_desc}}} @{hldmg} ${hldmgcrit} {{spelllevel=@{spelllevel}}} {{innate=@{spell_innate}}} {{globalattack=@{global_attack_mod}}} {{globaldamage=${globaldamage}}} {{globaldamagecrit=${globaldamagecrit}}} {{globaldamagetype=@{global_damage_mod_type}}} ammo=@{ammo} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
            } else if (atkflag != 0) {
                rollbase = `@{wtype}&{template:atk} {{mod=@{atkbonus}}} {{rname=[@{atkname}](~repeating_attack_attack_dmg)}} {{rnamec=[@{atkname}](~repeating_attack_attack_crit)}} {{r1=[[${r1}cs>@{atkcritrange}${hbonus}]]}} ${r2}cs>@{atkcritrange}${hbonus}]]}} {{range=@{atkrange}}} {{desc=@{atk_desc}}} {{spelllevel=@{spelllevel}}} {{innate=@{spell_innate}}} {{globalattack=@{global_attack_mod}}} ammo=@{ammo} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
            } else if (dmgflag1 != 0) {
                rollbase = `@{wtype}&{template:dmg} {{rname=@{atkname}}} @{atkflag} {{range=@{atkrange}}} @{dmgflag} {{dmg1=[[${hdmg1}]]}} {{dmg1type=${dmgtype}}} @{dmg2flag} {{dmg2=[[${hdmg2}]]}} {{dmg2type=${dmg2type}}} @{saveflag} {{desc=@{atk_desc}}} @{hldmg} {{spelllevel=@{spelllevel}}} {{innate=@{spell_innate}}} {{globaldamage=${globaldamage}}} {{globaldamagetype=@{global_damage_mod_type}}} ammo=@{ammo} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
            } else {
                rollbase = `@{wtype}&{template:dmg} {{rname=@{atkname}}} @{atkflag} {{range=@{atkrange}}} @{saveflag} {{desc=@{atk_desc}}} {{spelllevel=@{spelllevel}}} {{innate=@{spell_innate}}} ammo=@{ammo} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
            }

            update[`${repeating_attack}_rollbase_dmg`] = `@{wtype}&{template:dmg} {{rname=@{atkname}}} @{atkflag} {{range=@{atkrange}}} @{dmgflag} {{dmg1=[[${hdmg1}]]}} {{dmg1type=${dmgtype}}} @{dmg2flag} {{dmg2=[[${hdmg2}]]}} {{dmg2type=${dmg2type}}} @{saveflag} {{desc=@{atk_desc}}} @{hldmg} {{spelllevel=@{spelllevel}}} {{innate=@{spell_innate}}} {{globaldamage=${globaldamage}}} {{globaldamagetype=@{global_damage_mod_type}}} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
            update[`${repeating_attack}_rollbase_crit`] = `@{wtype}&{template:dmg} {{crit=1}} {{rname=@{atkname}}} @{atkflag} {{range=@{atkrange}}} @{dmgflag} {{dmg1=[[${hdmg1}]]}} {{dmg1type=${dmgtype}}} @{dmg2flag} {{dmg2=[[${hdmg2}]]}} {{dmg2type=${dmg2type}}} {{crit1=[[${crit1}]]}} {{crit2=[[${crit2}]]}} @{saveflag} {{desc=@{atk_desc}}} @{hldmg} ${hldmgcrit} {{spelllevel=@{spelllevel}}} {{innate=@{spell_innate}}} {{globaldamage=${globaldamage}}} {{globaldamagecrit=${globaldamagecrit}}} {{globaldamagetype=@{global_damage_mod_type}}} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
            update[`${repeating_attack}_atkbonus`] = bonus;
            update[`${repeating_attack}_rollbase`] = rollbase;

            if (v[`${repeating_attack}_spellid`] && v[`${repeating_attack}_spellid`] != "" && (!source || source && source != "spell") && v[`${repeating_attack}_spellid`].length == 20) {
                const spellid = v[`${repeating_attack}_spellid`];
                const lvl = v[`${repeating_attack}_spelllevel`];
                callbacks.push(() => {
                    update_spell_from_attack(lvl, spellid, attackid);
                });
            }
            if (v[`${repeating_attack}_itemid`] && v[`${repeating_attack}_itemid`] != "" && (!source || source && source != "item")) {
                const itemid = v[`${repeating_attack}_itemid`];
                callbacks.push(() => {
                    update_item_from_attack(itemid, attackid);
                });
            }
            setAttrs(update, { silent: true }, () => {
                callbacks.forEach((callback) => {
                    callback();
                });
            });
        });
    });
};

//Update spells in the attack section
const update_spell_from_attack = (lvl, spellid, attackid) => {
    const repeating_attack = `repeating_attack_${attackid}`;
    const repeating_spell = `repeating_spell-${lvl}_${spellid}`;
    let update = {};
    getAttrs([`${repeating_attack}_atkname`, `${repeating_attack}_atkrange`, `${repeating_attack}_atkflag`, `${repeating_attack}_atkattr_base`, `${repeating_attack}_dmgbase`, `${repeating_attack}_dmgtype`, `${repeating_attack}_dmg2base`, `${repeating_attack}_dmg2type`, `${repeating_attack}_saveflag`, `${repeating_attack}_saveattr`, `${repeating_attack}_saveeffect`], (v) => {
        update[`${repeating_spell}_spellname`] = v[`${repeating_attack}_atkname`];
        update[`${repeating_spell}_spellrange`] = v[`${repeating_attack}_atkrange`] || "";
        update[`${repeating_spell}_spellsavesuccess`] = v[`${repeating_attack}_saveeffect`] || "";

        if (v[`${repeating_attack}_dmgtype`] && v[`${repeating_attack}_dmgtype`].toLowerCase() == "healing") {
            if (v[`${repeating_attack}_dmgbase`] && v[`${repeating_attack}_dmgbase`] != "") {
                update[`${repeating_spell}_spellhealing`] = v[`${repeating_attack}_dmgbase`];
            }
        } else {
            if (v[`${repeating_attack}_dmgbase`] && v[`${repeating_attack}_dmgbase`] != "" && v[`${repeating_attack}_dmgbase`].indexOf("[[round((@{level} + 1) / 6 + 0.5)]]") === -1) {
                update[`${repeating_spell}_spelldamage`] = v[`${repeating_attack}_dmgbase`];
            } else if (!v[`${repeating_attack}_dmgbase`] || v[`${repeating_attack}_dmgbase`] === "") {
                update[`${repeating_spell}_spelldamage`] = "";
            }

            update[`${repeating_spell}_spelldamagetype`] = v[`${repeating_attack}_dmgtype`] || "";
        };
        if (v[`${repeating_attack}_dmg2type`] && v[`${repeating_attack}_dmg2type`].toLowerCase() === "healing") {
            if (v[`${repeating_attack}_dmgbase`] && v[`${repeating_attack}_dmgbase`] != "") {
                update[`${repeating_spell}_spellhealing`] = v[`${repeating_attack}_dmgbase`];
            }
        } else {
            update[`${repeating_spell}_spelldamage2`] = v[`${repeating_attack}_dmg2base`] || "";
            update[`${repeating_spell}_spelldamagetype2`] = v[`${repeating_attack}_dmg2type`] || "";
        };

        //SAVING THROW checkbox inside settings for the repeating attack
        update[`${repeating_spell}_spellsave`] = (v[`${repeating_attack}_saveflag`] && v[`${repeating_attack}_saveflag`] != "0") ? v[`${repeating_attack}_saveattr`] : "";
        setAttrs(update, { silent: true });
    });
};

var update_item_from_attack = function (itemid, attackid) {
    getAttrs(["repeating_attack_" + attackid + "_atkname", "repeating_attack_" + attackid + "_dmgbase", "repeating_attack_" + attackid + "_dmg2base", "repeating_attack_" + attackid + "_dmgtype", "repeating_attack_" + attackid + "_dmg2type", "repeating_attack_" + attackid + "_atkrange", "repeating_attack_" + attackid + "_atkmod", "repeating_attack_" + attackid + "_dmgmod", "repeating_inventory_" + itemid + "_itemmodifiers", "repeating_attack_" + attackid + "_versatile_alt", "repeating_inventory_" + itemid + "_itemproperties", "repeating_attack_" + attackid + "_atkmagic"], function (v) {
        var update = {};
        var mods = v["repeating_inventory_" + itemid + "_itemmodifiers"];
        var damage = v["repeating_attack_" + attackid + "_dmgbase"] ? v["repeating_attack_" + attackid + "_dmgbase"] : 0;
        var damage2 = v["repeating_attack_" + attackid + "_dmg2base"] ? v["repeating_attack_" + attackid + "_dmg2base"] : 0;
        var damagetype = v["repeating_attack_" + attackid + "_dmgtype"] ? v["repeating_attack_" + attackid + "_dmgtype"] : 0;
        var damagetype2 = v["repeating_attack_" + attackid + "_dmg2type"] ? v["repeating_attack_" + attackid + "_dmg2type"] : 0;
        var range = v["repeating_attack_" + attackid + "_atkrange"] ? v["repeating_attack_" + attackid + "_atkrange"] : 0;
        var attackmod = v["repeating_attack_" + attackid + "_atkmod"] ? v["repeating_attack_" + attackid + "_atkmod"] : 0;
        var damagemod = v["repeating_attack_" + attackid + "_dmgmod"] ? v["repeating_attack_" + attackid + "_dmgmod"] : 0;
        var magicmod = v["repeating_attack_" + attackid + "_atkmagic"] ? v["repeating_attack_" + attackid + "_atkmagic"] : 0;
        var atktype = "";
        var altprefix = v["repeating_attack_" + attackid + "_versatile_alt"] === "1" ? "Alternate " : "";

        if (/Alternate Damage:/i.test(v["repeating_inventory_" + itemid + "_itemmodifiers"])) {
            update["repeating_inventory_" + itemid + "_itemname"] = v["repeating_attack_" + attackid + "_atkname"].replace(/\s*(?:\(One-Handed\)|\(Two-Handed\))/, "");
        } else {
            update["repeating_inventory_" + itemid + "_itemname"] = v["repeating_attack_" + attackid + "_atkname"];
        }

        var attack_type_regex = /(?:^|,)\s*Item Type: (Melee|Ranged) Weapon(?:,|$)/i;
        var attack_type_results = attack_type_regex.exec(v["repeating_inventory_" + itemid + "_itemmodifiers"]);
        atktype = attack_type_results ? attack_type_results[1] : "";
        if (mods) {
            mods = mods.split(",");
        } else {
            mods = [];
        }

        var damage_regex = new RegExp("^\\s*" + altprefix + "Damage:\\s*(.+)$", "i");
        var damage_found = false;
        for (var i = 0; i < mods.length; i++) {
            if (damage_found = damage_regex.exec(mods[i])) {
                if (damage !== 0) {
                    mods[i] = mods[i].replace(damage_found[1], damage);
                } else {
                    mods.splice(i, 1);
                }
                break;
            }
        }
        if (!damage_found && damage !== 0) {
            mods.push(altprefix + "Damage: " + damage);
        }

        var damage2_regex = new RegExp("^\\s*" + altprefix + "Secondary Damage:\\s*(.+)$", "i");
        var damage2_found = false;
        for (var i = 0; i < mods.length; i++) {
            if (damage2_found = damage2_regex.exec(mods[i])) {
                if (damage2 !== 0) {
                    mods[i] = mods[i].replace(damage2_found[1], damage2);
                } else {
                    mods.splice(i, 1);
                }
                break;
            }
        }
        if (!damage2_found && damage2 !== 0) {
            mods.push(altprefix + "Secondary Damage: " + damage2);
        }

        var dmgtype_regex = new RegExp("^\\s*" + altprefix + "Damage Type:\\s*(.+)$", "i");
        var dmgtype_found = false;
        for (var i = 0; i < mods.length; i++) {
            if (dmgtype_found = dmgtype_regex.exec(mods[i])) {
                if (damagetype !== 0) {
                    mods[i] = mods[i].replace(dmgtype_found[1], damagetype);
                } else {
                    mods.splice(i, 1);
                }
                break;
            }
        }
        if (!dmgtype_found && damagetype !== 0) {
            mods.push(altprefix + "Damage Type: " + damagetype);
        }

        var dmgtype2_regex = new RegExp("^\\s*" + altprefix + "Secondary Damage Type:\\s*(.+)$", "i");
        var dmgtype2_found = false;
        for (var i = 0; i < mods.length; i++) {
            if (dmgtype2_found = dmgtype2_regex.exec(mods[i])) {
                if (damagetype2 !== 0) {
                    mods[i] = mods[i].replace(dmgtype_found[1], damagetype);
                } else {
                    mods.splice(i, 1);
                }
                break;
            }
        }
        if (!dmgtype2_found && damagetype2 !== 0) {
            mods.push(altprefix + "Secondary Damage Type: " + damagetype2);
        }

        var range_found = false;
        for (var i = 0; i < mods.length; i++) {
            if (range_found = /^\s*Range:\s*(.+)$/i.exec(mods[i])) {
                if (range !== 0) {
                    mods[i] = mods[i].replace(range_found[1], range);
                } else {
                    mods.splice(i, 1);
                }
                break;
            }
        }
        if (!range_found && range !== 0) {
            mods.push("Range: " + range);
        }

        var attackmod_regex = new RegExp("^\\s*(?:" + (atktype !== "" ? atktype + "|" : "") + "Weapon) Attacks \\+?(.+)$", "i");
        var attackmod_found = false;
        for (var i = 0; i < mods.length; i++) {
            if (attackmod_found = attackmod_regex.exec(mods[i])) {
                if (magicmod !== 0 || attackmod !== 0) {
                    mods[i] = mods[i].replace(attackmod_found[1], magicmod !== 0 ? magicmod : attackmod);
                } else {
                    mods.splice(i, 1);
                }
                break;
            }
        }
        if (!attackmod_found && (magicmod !== 0 || attackmod !== 0)) {
            var properties = v["repeating_inventory_" + itemid + "_itemproperties"];
            if (properties && /Thrown/i.test(properties)) {
                mods.push("Weapon Attacks: " + (magicmod !== 0 ? magicmod : attackmod));
            }
            else {
                mods.push(atktype + " Attacks: " + (magicmod !== 0 ? magicmod : attackmod));
            }
        }

        var damagemod_regex = new RegExp("^\\s*(?:" + (atktype !== "" ? atktype + "|" : "") + "Weapon) Damage \\+?(.+)$", "i");
        var damagemod_found = false;
        for (var i = 0; i < mods.length; i++) {
            if (damagemod_found = damagemod_regex.exec(mods[i])) {
                if (magicmod !== 0 || damagemod !== 0) {
                    mods[i] = mods[i].replace(damagemod_found[1], magicmod !== 0 ? magicmod : attackmod);
                } else {
                    mods.splice(i, 1);
                }
                break;
            }
        }
        if (!damagemod_found && (magicmod !== 0 || damagemod !== 0)) {
            var properties = v["repeating_inventory_" + itemid + "_itemproperties"];
            if (properties && /Thrown/i.test(properties)) {
                mods.push("Weapon Damage: " + (magicmod !== 0 ? magicmod : damagemod));
            }
            else {
                mods.push(atktype + " Damage: " + (magicmod !== 0 ? magicmod : damagemod));
            }
        }

        update["repeating_inventory_" + itemid + "_itemmodifiers"] = mods.join(",");

        setAttrs(update, { silent: true });
    });
};

var remove_attack = function (attackid) {
    removeRepeatingRow("repeating_attack_" + attackid);
};

const remove_resource = (id) => {
    const attr = (id === "other_resource") ? id : `repeating_resource_${id}_itemid`;
    let update = {};
    getAttrs([`${attr}`], (v) => {
        const itemid = v[`${attr}`];
        //Uncheck Use As A Resource in inventory for an item if its resource row is deleted
        if (itemid) {
            update[`repeating_inventory_${itemid}_useasresource`] = 0;
            update[`repeating_inventory_${itemid}_itemresourceid`] = "";
        };
        if (id == "other_resource") {
            update["other_resource"] = "";
            update["other_resource_name"] = "";
            update["other_resource_itemid"] = "";
            setAttrs(update, { silent: true });
        } else {
            const currentID = id.replace("repeating_resource_", "").substring(0, 20);
            const side = (id.includes("left")) ? `right` : `left`;
            //Get the inputs for the opposite side to see if they are empty.
            //If they are empty delete the entire row. Otherwise set the side that was the source of this event to empty strings
            getAttrs([`repeating_resource_${currentID}_resource_${side}`, `repeating_resource_${currentID}_resource_${side}_name`, `repeating_resource_${currentID}_resource_${side}_max`], (v) => {
                const Name = v[`repeating_resource_${currentID}_resource_${side}_name`] || false;
                const Value = v[`repeating_resource_${currentID}_resource_${side}`] || false;
                const Max = v[`repeating_resource_${currentID}_resource_${side}_max`] || false;
                if (!Name && !Value && !Max) {
                    removeRepeatingRow(`repeating_resource_${currentID}`);
                } else {
                    update[`repeating_resource_${id}`] = "";
                    update[`repeating_resource_${id}_name`] = "";
                    update[`repeating_resource_${id}_max`] = "";
                    update[`repeating_resource_${id}_itemid`] = "";
                };
                setAttrs(update, { silent: true });
            });
        };
    });
};

const update_weight = function () {
    let update = {};
    let wtotal = 0;
    let weight_attrs = ["cp", "sp", "ep", "gp", "pp", "encumberance_setting", "strength", "size", "carrying_capacity_mod"];
    getSectionIDs("repeating_inventory", (idarray) => {
        _.each(idarray, (currentID, i) => {
            weight_attrs.push(`repeating_inventory_${currentID}_itemweight`);
            weight_attrs.push(`repeating_inventory_${currentID}_itemcount`);
        });
        getAttrs(weight_attrs, (v) => {
            let coinWeight = 0;
            ["cp", "sp", "ep", "gp", "pp"].forEach((type) => {
                coinWeight += (isNaN(parseInt(v[`${type}`], 10)) === false) ? parseInt(v[`${type}`], 10) : 0;
            });
            wtotal = wtotal + ((coinWeight) / 50);

            _.each(idarray, (currentID, i) => {
                if (v[`repeating_inventory_${currentID}_itemweight`] && isNaN(parseInt(v[`repeating_inventory_${currentID}_itemweight`], 10)) === false) {
                    count = v[`repeating_inventory_${currentID}_itemcount`] && isNaN(parseFloat(v[`repeating_inventory_${currentID}_itemcount`])) === false ? parseFloat(v[`repeating_inventory_${currentID}_itemcount`]) : 1;
                    wtotal = wtotal + (parseFloat(v[`repeating_inventory_${currentID}_itemweight`]) * count);
                }
            });

            update["weighttotal"] = wtotal;

            const str_base = parseInt(v.strength, 10);
            let size_multiplier = 1;
            if (v["size"] && v["size"] != "") {
                const size = v["size"].toLowerCase().trim();
                size_multiplier =
                    (size === "tiny") ? .5 : (size === "large") ? 2 : (size === "huge") ? 4 : (size === "gargantuan") ? 8 : size_multiplier;
            };
            let str = str_base * size_multiplier;
            // Parse the carrying capacitiy modificator if any
            if (v.carrying_capacity_mod) {
                const operator = v.carrying_capacity_mod.substring(0, 1);
                const value = v.carrying_capacity_mod.substring(1);
                if (["*", "x", "+", "-"].indexOf(operator) > -1 && isNaN(parseFloat(value, 10)) === false) {
                    str =
                        (operator === "*" || operator == "x") ? str * parseFloat(value, 10) :
                            (operator === "+") ? str + parseFloat(value, 10) :
                                (operator === "-") ? str - parseFloat(value, 10) :
                                    str;
                }
            }

            if (!v.encumberance_setting || v.encumberance_setting === "off") {
                update["encumberance"] = (wtotal > str * 15) ? "OVER CARRYING CAPACITY" : " ";
            } else if (v.encumberance_setting === "on") {
                update["encumberance"] =
                    (wtotal > str * 15) ? "IMMOBILE" :
                        (wtotal > str * 10) ? "HEAVILY ENCUMBERED" :
                            (wtotal > str * 5) ? "ENCUMBERED" :
                                " ";
            } else {
                update["encumberance"] = " ";
            }

            setAttrs(update, { silent: true });

        });
    });
};

var update_ac = function () {
    getAttrs(["custom_ac_flag"], function (v) {
        if (v.custom_ac_flag === "2") {
            return;
        }
        else {
            var update = {};
            var ac_attrs = ["simpleinventory", "custom_ac_base", "custom_ac_part1", "custom_ac_part2", "strength_mod", "dexterity_mod", "constitution_mod", "intelligence_mod", "wisdom_mod", "charisma_mod", "custom_ac_shield"];
            getSectionIDs("repeating_acmod", function (acidarray) {
                _.each(acidarray, function (currentID, i) {
                    ac_attrs.push("repeating_acmod_" + currentID + "_global_ac_val");
                    ac_attrs.push("repeating_acmod_" + currentID + "_global_ac_active_flag");
                });
                getSectionIDs("repeating_inventory", function (idarray) {
                    _.each(idarray, function (currentID, i) {
                        ac_attrs.push("repeating_inventory_" + currentID + "_equipped");
                        ac_attrs.push("repeating_inventory_" + currentID + "_itemmodifiers");
                    });
                    getAttrs(ac_attrs, function (b) {
                        var custom_total = 0;
                        if (v.custom_ac_flag === "1") {
                            var base = isNaN(parseInt(b.custom_ac_base, 10)) === false ? parseInt(b.custom_ac_base, 10) : 10;
                            var part1attr = b.custom_ac_part1.toLowerCase();
                            var part2attr = b.custom_ac_part2.toLowerCase();
                            var part1 = part1attr === "none" ? 0 : parseInt(b[part1attr + "_mod"], 10);
                            var part2 = part2attr === "none" ? 0 : parseInt(b[part2attr + "_mod"], 10);
                            custom_total = base + part1 + part2;
                        }
                        var globalacmod = 0;
                        _.each(acidarray, function (currentID, i) {
                            if (b["repeating_acmod_" + currentID + "_global_ac_active_flag"] == "1") {
                                globalacmod += parseInt(b["repeating_acmod_" + currentID + "_global_ac_val"], 10);
                            }
                        });
                        var dexmod = +b["dexterity_mod"];
                        var total = 10 + dexmod;
                        var armorcount = 0;
                        var shieldcount = 0;
                        var armoritems = [];
                        if (b.simpleinventory === "complex") {
                            _.each(idarray, function (currentID, i) {
                                if (b["repeating_inventory_" + currentID + "_equipped"] && b["repeating_inventory_" + currentID + "_equipped"] === "1" && b["repeating_inventory_" + currentID + "_itemmodifiers"] && b["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().indexOf("ac") > -1) {
                                    var mods = b["repeating_inventory_" + currentID + "_itemmodifiers"].split(",");
                                    var ac = 0;
                                    var type = "mod";
                                    _.each(mods, function (mod) {
                                        if (mod.substring(0, 10) === "Item Type:") {
                                            type = mod.substring(11, mod.length).trim().toLowerCase();
                                        }
                                        if (mod.toLowerCase().indexOf("ac:") > -1 || mod.toLowerCase().indexOf("ac +") > -1 || mod.toLowerCase().indexOf("ac+") > -1) {
                                            var regex = mod.replace(/[^0-9]/g, "");
                                            var bonus = regex && regex.length > 0 && isNaN(parseInt(regex, 10)) === false ? parseInt(regex, 10) : 0;
                                            ac = ac + bonus;
                                        }
                                        if (mod.toLowerCase().indexOf("ac -") > -1 || mod.toLowerCase().indexOf("ac-") > -1) {
                                            var regex = mod.replace(/[^0-9]/g, "");
                                            var bonus = regex && regex.length > 0 && isNaN(parseInt(regex, 10)) === false ? parseInt(regex, 10) : 0;
                                            ac = ac - bonus;
                                        }
                                    });
                                    armoritems.push({ type: type, ac: ac });
                                }
                            });
                            armorcount = armoritems.filter(function (item) { return item["type"].indexOf("armor") > -1 }).length;
                            shieldcount = armoritems.filter(function (item) { return item["type"].indexOf("shield") > -1 }).length;
                            var base = dexmod;
                            var armorac = 10;
                            var shieldac = 0;
                            var modac = 0;

                            _.each(armoritems, function (item) {
                                if (item["type"].indexOf("light armor") > -1) {
                                    armorac = item["ac"];
                                    base = dexmod;
                                }
                                else if (item["type"].indexOf("medium armor") > -1) {
                                    armorac = item["ac"];
                                    base = Math.min(dexmod, 2);
                                }
                                else if (item["type"].indexOf("heavy armor") > -1) {
                                    armorac = item["ac"];
                                    base = 0;
                                }
                                else if (item["type"].indexOf("shield") > -1) {
                                    shieldac = item["ac"];
                                }
                                else {
                                    modac = modac + item["ac"]
                                }
                            });

                            total = base + armorac + shieldac + modac;

                        };
                        update["armorwarningflag"] = "hide";
                        update["customacwarningflag"] = "hide";
                        if (armorcount > 1 || shieldcount > 1) {
                            update["armorwarningflag"] = "show";
                        }
                        update["ac"] = total + globalacmod;
                        if (custom_total > 0) {
                            if (armorcount > 0 || (shieldcount > 0 && b.custom_ac_shield != "yes")) {
                                update["customacwarningflag"] = "show";
                            }
                            else {
                                update["ac"] = b.custom_ac_shield == "yes" ? custom_total + shieldac + globalacmod + modac : custom_total + globalacmod + modac;
                            }
                        }
                        setAttrs(update, { silent: true });
                    });
                });
            });
        };
    });
};

var check_customac = function (attr) {
    getAttrs(["custom_ac_flag", "custom_ac_part1", "custom_ac_part2"], function (v) {
        if (v["custom_ac_flag"] && v["custom_ac_flag"] === "1" && ((v["custom_ac_part1"] && v["custom_ac_part1"] === attr) || (v["custom_ac_part2"] && v["custom_ac_part2"] === attr))) {
            update_ac();
        }
    });
};

const update_initiative = () => {
    const attrs_to_get = ["dexterity", "dexterity_mod", "initmod", "jack_of_all_trades", "jack", "init_tiebreaker", "pb_type"];
    getSectionIDs("repeating_inventory", (idarray) => {
        _.each(idarray, (currentID) => {
            attrs_to_get.push(`repeating_inventory_${currentID}_equipped`);
            attrs_to_get.push(`repeating_inventory_${currentID}_itemmodifiers`);
        });
        getAttrs(attrs_to_get, (v) => {
            let update = {};
            let final_init = parseInt(v["dexterity_mod"], 10);
            if (v["initmod"] && !isNaN(parseInt(v["initmod"], 10))) {
                final_init = final_init + parseInt(v["initmod"], 10);
            }
            if (v["init_tiebreaker"] && v["init_tiebreaker"] != 0) {
                final_init = final_init + (parseInt(v["dexterity"], 10) / 100);
            }
            if (v["jack_of_all_trades"] && v["jack_of_all_trades"] != 0) {
                if (v["pb_type"] && v["pb_type"] === "die" && v["jack"]) {
                    final_init = final_init + "+" + v["jack"];
                } else if (v["jack"] && !isNaN(parseInt(v["jack"], 10))) {
                    final_init = final_init + parseInt(v["jack"], 10);
                }
            }
            _.each(idarray, (currentID) => {
                if (v[`repeating_inventory_${currentID}_equipped`] && v[`repeating_inventory_${currentID}_equipped`] === "1" && v[`repeating_inventory_${currentID}_itemmodifiers`] && v[`repeating_inventory_${currentID}_itemmodifiers`].toLowerCase().indexOf("ability checks") > -1) {
                    const mods = v[`repeating_inventory_${currentID}_itemmodifiers`].toLowerCase().split(",");
                    _.each(mods, (mod) => {
                        if (mod.indexOf("ability checks") > -1) {
                            const new_mod = !isNaN(parseInt(mod.replace(/[^0-9]/g, ""), 10)) ? parseInt(mod.replace(/[^0-9]/g, ""), 10) : false;
                            final_init = (mod.indexOf("-") > -1 && new_mod) ? final_init - new_mod : (new_mod) ? final_init + new_mod : final_init;
                        }
                    });
                }
            });
            if (final_init % 1 != 0) {
                final_init = parseFloat(final_init.toPrecision(12)); // ROUNDING ERROR BUGFIX
            }
            update["initiative_bonus"] = final_init;
            setAttrs(update, { silent: true });
        });
    });
};

const update_class = () => {
    getAttrs(["class", "base_level", "custom_class", "cust_hitdietype", "cust_spellcasting_ability", "cust_strength_save_prof", "cust_dexterity_save_prof", "cust_constitution_save_prof", "cust_intelligence_save_prof", "cust_wisdom_save_prof", "cust_charisma_save_prof", "npc"], (v) => {
        if (v.npc && v.npc == "1") { return; }
        const abilites = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
        //Custom Classes
        if (v.custom_class && v.custom_class != "0") {
            update = {};
            update["hitdietype"] = v.cust_hitdietype;
            update["spellcasting_ability"] = v.cust_spellcasting_ability;
            abilites.forEach((save) => {
                const ability = save.toLowerCase();
                update[`${ability}_save_prof`] = v[`cust_${ability}_save_prof`];
            });
            setAttrs(update, { silent: true });
            //If "Choose" has been selected in the select
        } else if (v.class === "") {
            update = {};
            update["hitdietype"] = 6;
            update["spellcasting_ability"] = "0*";
            abilites.forEach((save) => {
                const ability = save.toLowerCase();
                update[`${ability}_save_prof`] = 0;
            });
            setAttrs(update, { silent: true });
            //Standard classes can pull their data from the Comependium
        } else {
            getCompendiumPage(v.class, (pages) => {
                pages = removeDuplicatedPageData(pages);
                update = {};
                const classPages = (Array.isArray(pages)) ? pages : [pages];
                classPages.forEach((classData) => {
                    if (classData.data && 'Category' in classData.data && classData.data[`Category`] === "Classes") {
                        update["hitdietype"] = classData.data["Hit Die"].slice(1);
                        update["spellcasting_ability"] = (classData.data["Spellcasting Ability"]) ? `@{${classData.data["Spellcasting Ability"].toLowerCase()}_mod}+` : "0*";
                        abilites.forEach((save) => {
                            const ability = save.toLowerCase();
                            update[`${ability}_save_prof`] = (classData.data["data-Saving Throws"].indexOf(`${save}`) > -1) ? "(@{pb})" : 0;
                            update_save(ability);;
                        });
                    };

                    setAttrs(update, { silent: true });
                    //Update Spell info to change or remove casting attributes in Spells
                    update_spell_info();
                });
            });
        };
    });
    set_level();
};

const set_level = function () {
    getAttrs(["base_level", "multiclass1_flag", "multiclass2_flag", "multiclass3_flag", "multiclass1_lvl", "multiclass2_lvl", "multiclass3_lvl", "class", "multiclass1", "multiclass2", "multiclass3", "arcane_fighter", "arcane_rogue", "custom_class", "cust_spellslots", "cust_classname", "level_calculations", "class", "subclass", "multiclass1_subclass", "multiclass2_subclass", "multiclass3_subclass"], (v) => {
        let update = {};
        let callbacks = [];
        const multiclass = (v[`multiclass1_flag`] && v[`multiclass1_flag`] === "1") || (v.multiclass2_flag && v.multiclass2_flag === "1") || (v.multiclass3_flag && v.multiclass3_flag === "1") ? true : false;
        const finalclass = (v[`custom_class`] && v[`custom_class`] != "0") ? v[`cust_spellslots`] : v[`class`];
        let finallevel = (v[`base_level`] && v[`base_level`] > 0) ? parseInt(v.base_level, 10) : 1;
        const charclass = (v[`custom_class`] && v[`custom_class`] != "0") ? v[`cust_classname`] : v[`class`];
        let hitdie_final = (multiclass) ? `?{Hit Die Class|${charclass},@{hitdietype}` : "@{hitdietype}";
        const subclass = (v[`subclass`]) ? v[`subclass`] + " " : "";
        let class_display = `${subclass}${charclass} ${finallevel}`;

        // This nested array is used to determine the overall spellcasting level for the character.
        var classes = [[finalclass.toLowerCase(), v[`base_level`]]];

        ["multiclass1", "multiclass2", "multiclass3"].forEach((multiclass) => {
            if (v[`${multiclass}_flag`] && v[`${multiclass}_flag`] === "1") {
                const multiclasslevel = (v[`${multiclass}_lvl`] && v[`${multiclass}_lvl`] > 0) ? parseInt(v[`${multiclass}_lvl`], 10) : 1;
                const subclass = (v[`${multiclass}_subclass`]) ? v[`${multiclass}_subclass`] + " " : "";
                finallevel = finallevel + multiclasslevel;
                hitdie_final = `${hitdie_final}|` + v[`${multiclass}`].charAt(0).toUpperCase() + v[`${multiclass}`].slice(1) + "," + checkHitDie(v[`${multiclass}`]);
                classes.push([v[`${multiclass}`], multiclasslevel]);
                class_display = `${class_display}, ${subclass}` + v[`${multiclass}`] + ` ${multiclasslevel}`;
            };
        });

        const casterlevel = checkCasterLevel(classes, v[`arcane_fighter`], v[`arcane_rogue`]);

        update["hitdie_final"] = (multiclass) ? `${hitdie_final}}` : hitdie_final;
        update["level"] = finallevel;
        update["caster_level"] = casterlevel;
        update["class_display"] = class_display;

        if (!v["level_calculations"] || v["level_calculations"] === "on") {
            update["hit_dice_max"] = finallevel;
            callbacks.push(() => { update_spell_slots(); });
        }
        callbacks.push(() => { update_pb(); });
        callbacks.push(() => { update_leveler_display(); });
        setAttrs(update, { silent: true }, () => { callbacks.forEach((callback) => { callback(); }) });
    });
};

var isMultiCaster = function (classes, arcane_fighter, arcane_rogue) {
    var singlecaster = false;
    var multicaster = false;
    _.each(classes, function (multiclass) {
        var caster = getCasterType(multiclass[0], multiclass[1], arcane_fighter, arcane_rogue) > 0;
        if (caster && singlecaster) {
            multicaster = true;
        } else if (caster) {
            singlecaster = true;
        }
    });
    return multicaster;
};

var getCasterType = function (class_string, levels, arcane_fighter, arcane_rogue) {
    var full = ["bard", "cleric", "druid", "sorcerer", "wizard", "full"];
    var half = ["artificer", "paladin", "ranger", "half"];
    class_string = class_string.toLowerCase();
    if (full.indexOf(class_string) != -1) {
        return 1;
    } else if (half.indexOf(class_string) != -1) {
        if (class_string === "artificer" && levels == 1) return 1;
        return (levels == 1) ? 0 : (1 / 2);
    } else if (class_string === "third" || (class_string === "fighter" && arcane_fighter === "1") || (class_string === "rogue" && arcane_rogue === "1")) {
        return (levels == 1 || levels == 2) ? 0 : (1 / 3);
    } else {
        return 0;
    }
};

var checkCasterLevel = function (classes, arcane_fighter, arcane_rogue) {
    console.log("CHECKING CASTER LEVEL");
    var multicaster = isMultiCaster(classes, arcane_fighter, arcane_rogue);
    var totalcasterlevel = 0;
    _.each(classes, function (multiclass) {
        var casterlevel = parseInt(multiclass[1], 10) * getCasterType(multiclass[0], multiclass[1], arcane_fighter, arcane_rogue);
        // Characters with multiple spellcasting classes round down the casting level for that class
        // Character with a single spellcasting class round up the casting level
        totalcasterlevel = totalcasterlevel + (multicaster ? Math.floor(casterlevel) : Math.ceil(casterlevel));
    });
    return totalcasterlevel;
};

var checkHitDie = function (class_string) {
    var d10class = ["fighter", "paladin", "ranger"];
    var d8class = ["artificer", "bard", "cleric", "druid", "monk", "rogue", "warlock"];
    var d6class = ["sorcerer", "wizard"];
    class_string = class_string.toLowerCase();
    if (class_string === "barbarian") { return "12" }
    else if (d10class.indexOf(class_string) != -1) { return "10" }
    else if (d8class.indexOf(class_string) != -1) { return "8" }
    else if (d6class.indexOf(class_string) != -1) { return "6" }
    else { return "0" };
};

var update_leveler_display = function () {
    getAttrs(["experience", "level"], function (v) {
        let lvl = 0;
        let exp = 0;
        let update = {};
        update["showleveler"] = 0;
        if (v["level"] && !isNaN(parseInt(v["level"], 10)) && parseInt(v["level"], 10) > 0) {
            lvl = parseInt(v["level"], 10);
        }
        if (v["experience"] && !isNaN(parseInt(v["experience"], 10)) && parseInt(v["experience"], 10) > 0) {
            exp = parseInt(v["experience"], 10);
        }
        if (lvl > 0 && exp > 0) {
            if ((lvl === 1 && exp >= 300) || (lvl === 2 && exp >= 900) || (lvl === 3 && exp >= 2700) || (lvl === 4 && exp >= 6500) || (lvl === 5 && exp >= 14000) || (lvl === 6 && exp >= 23000) || (lvl === 7 && exp >= 34000) || (lvl === 8 && exp >= 48000) || (lvl === 9 && exp >= 64000) || (lvl === 10 && exp >= 85000) || (lvl === 11 && exp >= 100000) || (lvl === 12 && exp >= 120000) || (lvl === 13 && exp >= 140000) || (lvl === 14 && exp >= 165000) || (lvl === 15 && exp >= 195000) || (lvl === 16 && exp >= 225000) || (lvl === 17 && exp >= 265000) || (lvl === 18 && exp >= 305000) || (lvl === 19 && exp >= 355000)) {
                update["showleveler"] = 1;
            };
        };
        setAttrs(update, { silent: true });
    });
};

var update_spell_slots = function () {
    getAttrs(["lvl1_slots_mod", "lvl2_slots_mod", "lvl3_slots_mod", "lvl4_slots_mod", "lvl5_slots_mod", "lvl6_slots_mod", "lvl7_slots_mod", "lvl8_slots_mod", "lvl9_slots_mod", "caster_level"], function (v) {
        var update = {};
        var lvl = v["caster_level"] && !isNaN(parseInt(v["caster_level"], 10)) ? parseInt(v["caster_level"], 10) : 0;
        var l1 = v["lvl1_slots_mod"] && !isNaN(parseInt(v["lvl1_slots_mod"], 10)) ? parseInt(v["lvl1_slots_mod"], 10) : 0;
        var l2 = v["lvl2_slots_mod"] && !isNaN(parseInt(v["lvl2_slots_mod"], 10)) ? parseInt(v["lvl2_slots_mod"], 10) : 0;
        var l3 = v["lvl3_slots_mod"] && !isNaN(parseInt(v["lvl3_slots_mod"], 10)) ? parseInt(v["lvl3_slots_mod"], 10) : 0;
        var l4 = v["lvl4_slots_mod"] && !isNaN(parseInt(v["lvl4_slots_mod"], 10)) ? parseInt(v["lvl4_slots_mod"], 10) : 0;
        var l5 = v["lvl5_slots_mod"] && !isNaN(parseInt(v["lvl5_slots_mod"], 10)) ? parseInt(v["lvl5_slots_mod"], 10) : 0;
        var l6 = v["lvl6_slots_mod"] && !isNaN(parseInt(v["lvl6_slots_mod"], 10)) ? parseInt(v["lvl6_slots_mod"], 10) : 0;
        var l7 = v["lvl7_slots_mod"] && !isNaN(parseInt(v["lvl7_slots_mod"], 10)) ? parseInt(v["lvl7_slots_mod"], 10) : 0;
        var l8 = v["lvl8_slots_mod"] && !isNaN(parseInt(v["lvl8_slots_mod"], 10)) ? parseInt(v["lvl8_slots_mod"], 10) : 0;
        var l9 = v["lvl9_slots_mod"] && !isNaN(parseInt(v["lvl9_slots_mod"], 10)) ? parseInt(v["lvl9_slots_mod"], 10) : 0;
        if (lvl > 0) {
            l1 = l1 + Math.min((lvl + 1), 4);
            if (lvl < 3) { l2 = l2 + 0; } else if (lvl === 3) { l2 = l2 + 2; } else { l2 = l2 + 3; };
            if (lvl < 5) { l3 = l3 + 0; } else if (lvl === 5) { l3 = l3 + 2; } else { l3 = l3 + 3; };
            if (lvl < 7) { l4 = l4 + 0; } else if (lvl === 7) { l4 = l4 + 1; } else if (lvl === 8) { l4 = l4 + 2; } else { l4 = l4 + 3; };
            if (lvl < 9) { l5 = l5 + 0; } else if (lvl === 9) { l5 = l5 + 1; } else if (lvl < 18) { l5 = l5 + 2; } else { l5 = l5 + 3; };
            if (lvl < 11) { l6 = l6 + 0; } else if (lvl < 19) { l6 = l6 + 1; } else { l6 = l6 + 2; };
            if (lvl < 13) { l7 = l7 + 0; } else if (lvl < 20) { l7 = l7 + 1; } else { l7 = l7 + 2; };
            if (lvl < 15) { l8 = l8 + 0; } else { l8 = l8 + 1; };
            if (lvl < 17) { l9 = l9 + 0; } else { l9 = l9 + 1; };
        };

        update["lvl1_slots_total"] = l1;
        update["lvl2_slots_total"] = l2;
        update["lvl3_slots_total"] = l3;
        update["lvl4_slots_total"] = l4;
        update["lvl5_slots_total"] = l5;
        update["lvl6_slots_total"] = l6;
        update["lvl7_slots_total"] = l7;
        update["lvl8_slots_total"] = l8;
        update["lvl9_slots_total"] = l9;
        setAttrs(update, { silent: true });
    });
};

var update_pb = function () {
    callbacks = [];
    getAttrs(["level", "pb_type", "pb_custom"], function (v) {
        var update = {};
        var pb = 2;
        var lvl = parseInt(v["level"], 10);
        if (lvl < 5) { pb = "2" } else if (lvl < 9) { pb = "3" } else if (lvl < 13) { pb = "4" } else if (lvl < 17) { pb = "5" } else { pb = "6" }
        var jack = Math.floor(pb / 2);
        if (v["pb_type"] === "die") {
            update["jack"] = "d" + pb;
            update["pb"] = "d" + pb * 2;
            update["pbd_safe"] = "cs0cf0";
        }
        else if (v["pb_type"] === "custom" && v["pb_custom"] && v["pb_custom"] != "") {
            update["pb"] = v["pb_custom"]
            update["jack"] = !isNaN(parseInt(v["pb_custom"], 10)) ? Math.floor(parseInt(v["pb_custom"], 10) / 2) : jack;
            update["pbd_safe"] = "";
        }
        else {
            update["pb"] = pb;
            update["jack"] = jack;
            update["pbd_safe"] = "";
        };
        callbacks.push(function () { update_attacks("all"); });
        callbacks.push(function () { update_spell_info(); });
        callbacks.push(function () { update_jack_attr(); });
        callbacks.push(function () { update_initiative(); });
        callbacks.push(function () { update_tool("all"); });
        callbacks.push(function () { update_all_saves(); });
        callbacks.push(function () { update_skills(["athletics", "acrobatics", "sleight_of_hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal_handling", "insight", "medicine", "perception", "survival", "deception", "intimidation", "performance", "persuasion"]); });

        setAttrs(update, { silent: true }, function () { callbacks.forEach(function (callback) { callback(); }) });
    });
};

var update_jack_attr = function () {
    var update = {};
    getAttrs(["jack_of_all_trades", "jack"], function (v) {
        if (v["jack_of_all_trades"] && v["jack_of_all_trades"] != 0) {
            update["jack_bonus"] = "+" + v["jack"];
            update["jack_attr"] = "+" + v["jack"] + "@{pbd_safe}";
        }
        else {
            update["jack_bonus"] = "";
            update["jack_attr"] = "";
        }
        setAttrs(update, { silent: true });
    });
};

var update_spell_info = function (attr) {
    var update = {};
    getAttrs(["spellcasting_ability", "spell_dc_mod", "globalmagicmod", "strength_mod", "dexterity_mod", "constitution_mod", "intelligence_mod", "wisdom_mod", "charisma_mod"], function (v) {
        if (attr && v["spellcasting_ability"] && v["spellcasting_ability"].indexOf(attr) === -1) {
            return
        };
        if (!v["spellcasting_ability"] || (v["spellcasting_ability"] && v["spellcasting_ability"] === "0*")) {
            update["spell_attack_bonus"] = "0";
            update["spell_save_dc"] = "0";
            var callback = function () { update_attacks("spells") };
            setAttrs(update, { silent: true }, callback);
            return
        };
        var attr = attr ? attr : "";
        console.log("UPDATING SPELL INFO: " + attr);

        var ability = parseInt(v[v["spellcasting_ability"].substring(2, v["spellcasting_ability"].length - 2)], 10);
        var spell_mod = v["globalmagicmod"] && !isNaN(parseInt(v["globalmagicmod"], 10)) ? parseInt(v["globalmagicmod"], 10) : 0;
        var atk = v["globalmagicmod"] && !isNaN(parseInt(v["globalmagicmod"], 10)) ? ability + parseInt(v["globalmagicmod"], 10) : ability;
        var dc = v["spell_dc_mod"] && !isNaN(parseInt(v["spell_dc_mod"], 10)) ? 8 + ability + parseInt(v["spell_dc_mod"], 10) : 8 + ability;
        var itemfields = ["pb_type", "pb"];

        getSectionIDs("repeating_inventory", function (idarray) {
            _.each(idarray, function (currentID, i) {
                itemfields.push("repeating_inventory_" + currentID + "_equipped");
                itemfields.push("repeating_inventory_" + currentID + "_itemmodifiers");
            });
            getAttrs(itemfields, function (v) {
                _.each(idarray, function (currentID) {
                    if ((!v["repeating_inventory_" + currentID + "_equipped"] || v["repeating_inventory_" + currentID + "_equipped"] === "1") && v["repeating_inventory_" + currentID + "_itemmodifiers"] && v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().indexOf("spell" > -1)) {
                        var mods = v["repeating_inventory_" + currentID + "_itemmodifiers"].toLowerCase().split(",");
                        _.each(mods, function (mod) {
                            if (mod.indexOf("spell attack") > -1) {
                                var substr = mod.slice(mod.lastIndexOf("spell attack") + "spell attack".length);
                                atk = substr && substr.length > 0 && !isNaN(parseInt(substr, 10)) ? atk + parseInt(substr, 10) : atk;
                                spell_mod = substr && substr.length > 0 && !isNaN(parseInt(substr, 10)) ? spell_mod + parseInt(substr, 10) : spell_mod;
                            };
                            if (mod.indexOf("spell dc") > -1) {
                                var substr = mod.slice(mod.lastIndexOf("spell dc") + "spell dc".length);
                                dc = substr && substr.length > 0 && !isNaN(parseInt(substr, 10)) ? dc + parseInt(substr, 10) : dc;
                            };
                        });
                    };
                });

                if (v["pb_type"] && v["pb_type"] === "die") {
                    atk = atk + "+" + v["pb"];
                    //Fixing Spell DC when using type Die
                    //By Miguel
                    //Used to be equals to: dc + parseInt(v["pb"].substring(1), 10) / 2
                    dc = dc + "+" + v["pb"];
                }
                else {
                    atk = parseInt(atk, 10) + parseInt(v["pb"], 10);
                    dc = parseInt(dc, 10) + parseInt(v["pb"], 10);
                };
                update["spell_attack_mod"] = spell_mod;
                update["spell_attack_bonus"] = atk;
                update["spell_save_dc"] = dc;
                var callback = function () { update_attacks("spells") };
                setAttrs(update, { silent: true }, callback);
            });
        });
    });
};

var update_passive_perception = function () {
    getAttrs(["pb_type", "passiveperceptionmod", "perception_bonus"], function (v) {
        var passive_perception = 10;
        var mod = !isNaN(parseInt(v["passiveperceptionmod"], 10)) ? parseInt(v["passiveperceptionmod"], 10) : 0;
        var bonus = !isNaN(parseInt(v["perception_bonus"], 10)) ? parseInt(v["perception_bonus"], 10) : 0;
        if (v["pb_type"] && v["pb_type"] === "die" && v["perception_bonus"] && isNaN(v["perception_bonus"]) && v["perception_bonus"].indexOf("+") > -1) {
            var pieces = v["perception_bonus"].split(/\+|d/);
            var base = !isNaN(parseInt(pieces[0], 10)) ? parseInt(pieces[0], 10) : 0;
            var num_dice = !isNaN(parseInt(pieces[1], 10)) ? parseInt(pieces[1], 10) : 1;
            var half_pb_die = !isNaN(parseInt(pieces[2], 10)) ? parseInt(pieces[2], 10) / 2 : 2;
            bonus = base + (num_dice * half_pb_die);
        }
        passive_perception = passive_perception + bonus + mod;
        setAttrs({ passive_wisdom: passive_perception })
    });
};

var update_race_display = function () {
    getAttrs(["race", "subrace"], function (v) {
        var final_race = "";
        final_race = v.subrace ? v.subrace : v.race;
        if (v.race.toLowerCase() === "dragonborn") { final_race = v.race; };
        setAttrs({ race_display: final_race });
    });
};

var organize_section_proficiencies = function () {
    getSectionIDs("proficiencies", function (ids) {
        var attribs = ["_reporder_repeating_proficiencies"];
        _.each(ids, function (id) {
            attribs.push("repeating_proficiencies_" + id + "_prof_type");
            attribs.push("repeating_proficiencies_" + id + "_name");
        });

        getAttrs(attribs, function (v) {
            var final_array = _(ids).chain().sortBy(function (id) {
                return v["repeating_proficiencies_" + id + "_name"];
            }).sortBy(function (id) {
                return v["repeating_proficiencies_" + id + "_prof_type"];
            }).value();
            _.each(final_array, function (id) {
            });
            if (final_array && final_array.length > 0) {
                setSectionOrder("proficiencies", final_array);
            };
        });
    });
};

const update_challenge = () => {
    getAttrs(["npc_challenge"], (v) => {
        let update = {};
        const challengeRatingsXP = {
            '0': '10', '1/8': '25', '1/4': '50', '1/2': '100', '1': '200', '2': '450', '3': '700', '4': '1100', '5': '1800', '6': '2300', '7': '2900', '8': '3900', '9': '5000', '10': '5900', '11': '7200', '12': '8400', '13': '10000', '14': '11500', '15': '13000', '16': '15000', '17': '18000', '18': '20000', '19': '22000', '20': '25000', '21': '33000', '22': '41000', '23': '50000', '24': '62000', '25': '75000', '26': '90000', '27': '105000', '28': '120000', '29': '135000', '30': '155000'
        };

        const xp = parseInt(challengeRatingsXP[v.npc_challenge]) || 0;
        const pb = xp <= 1100 ? 2 : xp <= 3900 ? 3 : xp <= 8400 ? 4 : xp <= 15000 ? 5 : xp <= 25000 ? 6 : xp <= 62000 ? 7 : xp <= 120000 ? 8 : xp <= 155000 ? 9 : 0;

        update["npc_xp"] = xp;
        update["pb_custom"] = pb;
        update["pb_type"] = "custom";
        setAttrs(update, { silent: true }, function () { update_pb() });
    });
};

const update_npc_saves = () => {
    const list = ["npc_str_save_base", "npc_dex_save_base", "npc_con_save_base", "npc_int_save_base", "npc_wis_save_base", "npc_cha_save_base"];
    const type = "save";
    update_npc_lists(list, type);
};

const update_npc_skills = () => {
    const list = ["npc_acrobatics_base", "npc_animal_handling_base", "npc_arcana_base", "npc_athletics_base", "npc_deception_base", "npc_history_base", "npc_insight_base", "npc_intimidation_base", "npc_investigation_base", "npc_medicine_base", "npc_nature_base", "npc_perception_base", "npc_performance_base", "npc_persuasion_base", "npc_religion_base", "npc_sleight_of_hand_base", "npc_stealth_base", "npc_survival_base"];
    const type = "skills";
    update_npc_lists(list, type);
};

const update_npc_lists = (list, type) => {
    getAttrs(list, function (v) {
        let update = {};
        let last_save = 0;
        let npc_flag = 0;

        _.each(list.reverse(), (base) => {
            const attr = base.slice(4, -5); //Remove npc_ and _base
            let item = parseInt(v[`${base}`], 10);

            // CSS will add comma :after 2 & 4 and +/- :before
            // 1 = Positive Number, 2 = Last Number, 3 = Negative Number, 4 = Last Negative Number
            if (v[`${base}`] && !isNaN(item) || v[`${base}`] === 0) {
                if (last_save === 0) {
                    last_save = 1;
                    item_flag = item < 0 ? 4 : 2;
                } else {
                    item_flag = item < 0 ? 3 : 1;
                }
            } else {
                item_flag = 0;
                item = "";
            };

            update[`npc_${attr}_flag`] = item_flag;
            update[`npc_${attr}`] = item;

            npc_flag += item_flag;
        });

        const flagAttr = (type === "save") ? "saving" : type;
        update[`npc_${flagAttr}_flag`] = (npc_flag === 0) ? "" : npc_flag;

        setAttrs(update, { silent: true });
    });
};

var update_npc_action = function (update_id, legendary) {
    if (update_id.substring(0, 1) === "-" && update_id.length === 20) {
        do_update_npc_action([update_id], legendary);
    }
    else if (update_id === "all") {
        var legendary_array = [];
        var actions_array = [];
        getSectionIDs("repeating_npcaction-l", function (idarray) {
            legendary_array = idarray;
            if (legendary_array.length > 0) {
                do_update_npc_action(legendary_array, true);
            }
            getSectionIDs("repeating_npcaction", function (idarray) {
                actions_array = idarray.filter(function (i) { return legendary_array.indexOf(i) < 0; });
                if (actions_array.length > 0) {
                    do_update_npc_action(actions_array, false);
                };
            });
        });
    };
};

var do_update_npc_action = function (action_array, legendary) {
    var repvar = legendary ? "repeating_npcaction-l_" : "repeating_npcaction_";
    var action_attribs = ["dtype"];
    _.each(action_array, function (actionid) {
        action_attribs.push(repvar + actionid + "_attack_flag");
        action_attribs.push(repvar + actionid + "_attack_type");
        action_attribs.push(repvar + actionid + "_attack_range");
        action_attribs.push(repvar + actionid + "_attack_target");
        action_attribs.push(repvar + actionid + "_attack_tohit");
        action_attribs.push(repvar + actionid + "_attack_damage");
        action_attribs.push(repvar + actionid + "_attack_damagetype");
        action_attribs.push(repvar + actionid + "_attack_damage2");
        action_attribs.push(repvar + actionid + "_attack_damagetype2");
    });

    getAttrs(action_attribs, function (v) {
        _.each(action_array, function (actionid) {
            console.log("UPDATING NPC ACTION: " + actionid);
            var callbacks = [];
            var update = {};
            var onhit = "";
            var damage_flag = "";
            var range = "";
            var attack_flag = v[repvar + actionid + "_attack_flag"] && v[repvar + actionid + "_attack_flag"] != "0" ? "{{attack=1}}" : "";
            var tohit = v[repvar + actionid + "_attack_tohit"] && isNaN(parseInt(v[repvar + actionid + "_attack_tohit"], 10)) === false ? parseInt(v[repvar + actionid + "_attack_tohit"], 10) : 0;
            if (v[repvar + actionid + "_attack_type"] && v[repvar + actionid + "_attack_range"]) {
                if (v[repvar + actionid + "_attack_type"] === "Melee") { var rangetype = "Reach"; } else { var rangetype = "Range"; };
                range = ", " + rangetype + " " + v[repvar + actionid + "_attack_range"];
            }
            var target = v[repvar + actionid + "_attack_target"] && v[repvar + actionid + "_attack_target"] != "" ? ", " + v[repvar + actionid + "_attack_target"] : ""
            var attack_tohitrange = "+" + tohit + range + target;
            var dmg1 = v[repvar + actionid + "_attack_damage"] && v[repvar + actionid + "_attack_damage"] != "" ? v[repvar + actionid + "_attack_damage"] : "";
            var dmg1type = v[repvar + actionid + "_attack_damagetype"] && v[repvar + actionid + "_attack_damagetype"] != "" ? " " + v[repvar + actionid + "_attack_damagetype"] : "";
            var dmg2 = v[repvar + actionid + "_attack_damage2"] && v[repvar + actionid + "_attack_damage2"] != "" ? v[repvar + actionid + "_attack_damage2"] : "";
            var dmg2type = v[repvar + actionid + "_attack_damagetype2"] && v[repvar + actionid + "_attack_damagetype2"] != "" ? " " + v[repvar + actionid + "_attack_damagetype2"] : "";
            var dmgspacer = dmg1 != "" && dmg2 != "" ? " plus " : "";

            var parsed_dmg1 = parse_roll_string(dmg1);
            var parsed_dmg2 = parse_roll_string(dmg2);

            if (dmg1 != "") {
                onhit = onhit + parsed_dmg1.avg + " (" + dmg1 + ")" + dmg1type + " damage";
            };
            dmgspacer = dmg1 != "" && dmg2 != "" ? " plus " : "";
            onhit = onhit + dmgspacer;
            if (dmg2 != "") {
                onhit = onhit + parsed_dmg2.avg + " (" + dmg2 + ")" + dmg2type + " damage";
            };
            if (dmg1 != "" || dmg2 != "") { damage_flag = damage_flag + "{{damage=1}} " };
            if (dmg1 != "") { damage_flag = damage_flag + "{{dmg1flag=1}} " };
            if (dmg2 != "") { damage_flag = damage_flag + "{{dmg2flag=1}} " };

            var crit1 = "";
            if (parsed_dmg1.rolls.length > 0) {
                parsed_dmg1.rolls.forEach(function (value) {
                    crit1 += parsed_dmg1.array[value] + "+";
                });
                crit1 = crit1.substring(0, crit1.length - 1);
            }

            var crit2 = "";
            if (parsed_dmg2.rolls.length > 0) {
                parsed_dmg2.rolls.forEach(function (value) {
                    crit2 += parsed_dmg2.array[value] + "+";
                });
                crit2 = crit2.substring(0, crit2.length - 1);
            }

            var rollbase = "";
            if (v.dtype === "full") {
                rollbase = `@{wtype}&{template:npcaction} ${attack_flag} @{damage_flag} @{npc_name_flag} {{rname=@{name}}} {{r1=[[@{d20}+(@{attack_tohit}+0)]]}} @{rtype}+(@{attack_tohit}+0)]]}} {{dmg1=[[@{attack_damage}+0]]}} {{dmg1type=@{attack_damagetype}}} {{dmg2=[[@{attack_damage2}+0]]}} {{dmg2type=@{attack_damagetype2}}} {{crit1=[[@{attack_crit}+0]]}} {{crit2=[[@{attack_crit2}+0]]}} {{description=@{show_desc}}} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
            }
            else if (v[repvar + actionid + "_attack_flag"] && v[repvar + actionid + "_attack_flag"] != "0") {
                if (legendary) {
                    rollbase = `@{wtype}&{template:npcatk} ${attack_flag} @{damage_flag} @{npc_name_flag} {{rname=[@{name}](~repeating_npcaction-l_npc_dmg)}} {{rnamec=[@{name}](~repeating_npcaction-l_npc_crit)}} {{type=[Attack](~repeating_npcaction-l_npc_dmg)}} {{typec=[Attack](~repeating_npcaction-l_npc_crit)}} {{r1=[[@{d20}+(@{attack_tohit}+0)]]}} @{rtype}+(@{attack_tohit}+0)]]}} {{description=@{show_desc}}} @{charname_output} {{licensedsheet=@{licensedsheet}}}`
                }
                else {
                    rollbase = `@{wtype}&{template:npcatk} ${attack_flag} @{damage_flag} @{npc_name_flag} {{rname=[@{name}](~repeating_npcaction_npc_dmg)}} {{rnamec=[@{name}](~repeating_npcaction_npc_crit)}} {{type=[Attack](~repeating_npcaction_npc_dmg)}} {{typec=[Attack](~repeating_npcaction_npc_crit)}} {{r1=[[@{d20}+(@{attack_tohit}+0)]]}} @{rtype}+(@{attack_tohit}+0)]]}} {{description=@{show_desc}}} @{charname_output} {{licensedsheet=@{licensedsheet}}}`;
                }
            }
            else if (dmg1 || dmg2) {
                rollbase = `@{wtype}&{template:npcdmg} @{damage_flag} {{dmg1=[[@{attack_damage}+0]]}} {{dmg1type=@{attack_damagetype}}} {{dmg2=[[@{attack_damage2}+0]]}} {{dmg2type=@{attack_damagetype2}}} {{crit1=[[@{attack_crit}+0]]}} {{crit2=[[@{attack_crit2}+0]]}} @{charname_output} {{licensedsheet=@{licensedsheet}}}`
            }
            else {
                rollbase = `@{wtype}&{template:npcaction} @{npc_name_flag} {{rname=@{name}}} {{description=@{show_desc}}} @{charname_output} {{licensedsheet=@{licensedsheet}}}`
            }

            update[repvar + actionid + "_attack_tohitrange"] = attack_tohitrange;
            update[repvar + actionid + "_attack_onhit"] = onhit;
            update[repvar + actionid + "_damage_flag"] = damage_flag;
            update[repvar + actionid + "_attack_crit"] = crit1;
            update[repvar + actionid + "_attack_crit2"] = crit2;
            update[repvar + actionid + "_rollbase"] = rollbase;
            setAttrs(update, { silent: true });
        });
    });
};

var parse_roll_string = function (rollstring) {
    var out = { array: [], avg: 0, rolls: [] };

    if (!rollstring || rollstring === "") {
        return out;
    }

    var rs_regex_initial = /(\-?\d+(?:d\d+)?)/ig;
    var rs_regex_repeating = /([\+\-])(\-?\d+(?:d\d+)?)/ig;
    var rs_nospace = rollstring.replace(/\s/g, '');
    var rs_initial = rs_regex_initial.exec(rs_nospace);

    if (rs_initial) {
        out.array.push(rs_initial[1]);
        rs_regex_repeating.lastIndex = rs_regex_initial.lastIndex;
        var rs_repeating;
        while (rs_repeating = rs_regex_repeating.exec(rs_nospace)) {
            out.array.push(rs_repeating[1], rs_repeating[2]);
        }
    }

    var add = true;
    var dice_regex = /(\d+)d(\d+)/i;
    var dice;

    out.array.forEach(function (value, index, array) {
        if (value === "+") {
            add = true;
        } else if (value === "-") {
            add = false;
        } else if (dice = dice_regex.exec(value)) {
            // this value is a die roll
            var dice_avg = Math.floor(+dice[1] * (+dice[2] / 2 + 0.5));
            out.avg += add ? dice_avg : -dice_avg;
            out.rolls.push(index);
        } else {
            // this value is a number
            out.avg += add ? +value : -+value;
        }
    })

    return out;
};

var get_class_level = function (class_name, callback) {
    getAttrs(["class", "base_level", "multiclass1_flag", "multiclass1", "multiclass1_lvl", "multiclass2_flag", "multiclass2", "multiclass2_lvl", "multiclass3_flag", "multiclass3", "multiclass3_lvl"], function (attrs) {
        var regex = new RegExp(class_name, "i");
        if (regex.test(attrs["class"])) {
            callback(attrs.base_level);
        } else if (attrs.multiclass1_flag && attrs.multiclass1_flag !== "0" && regex.test(attrs.multiclass1)) {
            callback(attrs.multiclass1_lvl);
        } else if (attrs.multiclass2_flag && attrs.multiclass2_flag !== "0" && regex.test(attrs.multiclass2)) {
            callback(attrs.multiclass2_lvl);
        } else if (attrs.multiclass3_flag && attrs.multiclass3_flag !== "0" && regex.test(attrs.multiclass3)) {
            callback(attrs.multiclass3_lvl);
        } else {
            callback("0");
        }
    });
};

var update_globaldamage = function (callback) {
    getSectionIDs("damagemod", function (ids) {
        if (ids) {
            var fields = {};
            var attr_name_list = [];
            ids.forEach(function (id) {
                fields[id] = {};
                attr_name_list.push(`repeating_damagemod_${id}_global_damage_active_flag`, `repeating_damagemod_${id}_global_damage_name`, `repeating_damagemod_${id}_global_damage_damage`, `repeating_damagemod_${id}_global_damage_type`);
            });

            getAttrs(attr_name_list, function (attrs) {
                var regex = /^repeating_damagemod_(.+)_global_damage_(active_flag|name|damage|type)$/;
                _.each(attrs, function (obj, name) {
                    var r = regex.exec(name);
                    if (r) {
                        fields[r[1]][r[2]] = obj;
                    };
                });

                var update = { global_damage_mod_roll: "", global_damage_mod_crit: "", global_damage_mod_type: "" };

                console.log("GLOBALDAMAGE");
                _.each(fields, function (element) {
                    if (element.active_flag != "0") {
                        if (element.name && element.name !== "") { update["global_damage_mod_roll"] += element.damage + '[' + element.name + ']' + "+"; }
                        if (element.type && element.type !== "") { update["global_damage_mod_type"] += element.type + "/"; }
                    }
                });

                update["global_damage_mod_roll"] = update["global_damage_mod_roll"].replace(/\+(?=$)/, '');
                update["global_damage_mod_type"] = update["global_damage_mod_type"].replace(/\/(?=$)/, '');

                // Remove any non-roll damage modifiers from the global damage modifier for the crit rolls
                // Will also remove any labels attached to these non-roll damage modifiers
                update["global_damage_mod_crit"] = update["global_damage_mod_roll"].replace(/(?:[+\-*\/%]|\*\*|^)\s*\d+(?:\[.*?])?(?!d\d+)/gi, '')
                    // If what was just replace removed the first damage modifier, remove any now precending plus signs
                    .replace(/(?:^\+)/i, '');

                setAttrs(update, { silent: true }, function () {
                    update_attacks("all");
                    if (typeof callback == "function") callback();
                });
            });
        }
    });
};

var update_globalattack = function (callback) {
    getSectionIDs("tohitmod", function (ids) {
        if (ids) {
            var fields = {};
            var attr_name_list = [];
            ids.forEach(function (id) {
                fields[id] = {};
                attr_name_list.push(`repeating_tohitmod_${id}_global_attack_active_flag`, `repeating_tohitmod_${id}_global_attack_roll`, `repeating_tohitmod_${id}_global_attack_name`);
            });
            getAttrs(attr_name_list, function (attrs) {
                var regex = /^repeating_tohitmod_(.+)_global_attack_(active_flag|roll|name)$/;
                _.each(attrs, function (obj, name) {
                    var r = regex.exec(name);
                    if (r) {
                        fields[r[1]][r[2]] = obj;
                    }
                });

                var update = { global_attack_mod: "" };
                console.log("GLOBALATTACK");
                _.each(fields, function (element) {
                    if (element.active_flag != "0") {
                        if (element.roll && element.roll !== "") { update["global_attack_mod"] += element.roll + "[" + element.name + "]" + "+"; }
                    }
                });
                if (update["global_attack_mod"] !== "") {
                    update["global_attack_mod"] = "[[" + update["global_attack_mod"].replace(/\+(?=$)/, '') + "]]";
                }
                setAttrs(update, { silent: true }, function () {
                    if (typeof callback == "function") callback();
                });
            });
        }
    });
};

var update_globalsaves = function (callback) {
    getSectionIDs("savemod", function (ids) {
        if (ids) {
            var fields = {};
            var attr_name_list = [];
            ids.forEach(function (id) {
                fields[id] = {};
                attr_name_list.push(`repeating_savemod_${id}_global_save_active_flag`, `repeating_savemod_${id}_global_save_roll`, `repeating_savemod_${id}_global_save_name`);
            });
            getAttrs(attr_name_list, function (attrs) {
                var regex = /^repeating_savemod_(.+)_global_save_(active_flag|roll|name)$/;
                _.each(attrs, function (obj, name) {
                    var r = regex.exec(name);
                    if (r) {
                        fields[r[1]][r[2]] = obj;
                    }
                });

                var update = { global_save_mod: "" };
                console.log("GLOBAL SAVES");
                _.each(fields, function (element) {
                    if (element.active_flag != "0") {
                        if (element.roll && element.roll !== "") { update["global_save_mod"] += element.roll + "[" + element.name + "]" + "+"; }
                    }
                });
                if (update["global_save_mod"] !== "") {
                    update["global_save_mod"] = "[[" + update["global_save_mod"].replace(/\+(?=$)/, '') + "]]";
                }
                setAttrs(update, { silent: true }, function () {
                    if (typeof callback == "function") callback();
                });
            });
        }
    });
};

var update_globalskills = function (callback) {
    getSectionIDs("skillmod", function (ids) {
        if (ids) {
            var fields = {};
            var attr_name_list = [];
            ids.forEach(function (id) {
                fields[id] = {};
                attr_name_list.push(`repeating_skillmod_${id}_global_skill_active_flag`, `repeating_skillmod_${id}_global_skill_roll`, `repeating_skillmod_${id}_global_skill_name`);
            });
            getAttrs(attr_name_list, function (attrs) {
                var regex = /^repeating_skillmod_(.+)_global_skill_(active_flag|roll|name)$/;
                _.each(attrs, function (obj, name) {
                    var r = regex.exec(name);
                    if (r) {
                        fields[r[1]][r[2]] = obj;
                    }
                });

                var update = { global_skill_mod: "" };
                console.log("GLOBAL SKILLS");
                _.each(fields, function (element) {
                    if (element.active_flag != "0") {
                        if (element.roll && element.roll !== "") { update["global_skill_mod"] += element.roll + "[" + element.name + "]" + "+"; }
                    }
                });
                if (update["global_skill_mod"] !== "") {
                    update["global_skill_mod"] = "[[" + update["global_skill_mod"].replace(/\+(?=$)/, '') + "]]";
                }
                setAttrs(update, { silent: true }, function () {
                    if (typeof callback == "function") callback();
                });
            });
        }
    });
};

var check_l1_mancer = function () {
    getAttrs(["class", "base_level", "strength_base", "dexterity_base", "constitution_base", "intelligence_base", "wisdom_base", "charisma_base", "l1mancer_status", "version", "charactermancer_step"], function (v) {
        if (!v["version"] || parseFloat(v["version"]) < 2.2) {
            return;
        }
        if (v["l1mancer_status"] && v["l1mancer_status"] === "completed") {
            return;
        }

        if (v["charactermancer_step"] && v["charactermancer_step"].split("-")[0] == "l1") {
            startCharactermancer(v["charactermancer_step"]);
        }
        else {
            if (v["l1mancer_status"] && v["l1mancer_status"] === "relaunch") {
                startCharactermancer("l1-welcome");
            } else {
                setAttrs({ mancer_confirm_flag: 1 });
            }
        }
    });
};

var check_lp_mancer = function () {
    getAttrs(["class", "base_level", "strength_base", "dexterity_base", "constitution_base", "intelligence_base", "wisdom_base", "charisma_base", "l1mancer_status", "lpmancer_status", "version", "charactermancer_step"], function (v) {
        if (v["lpmancer_status"] === "active" && v["charactermancer_step"] && v["charactermancer_step"].split("-")[0] == "lp") {
            startCharactermancer(v["charactermancer_step"]);
        }
    });
};

on("mancer:cancel", function (eventinfo) {
    if (!eventinfo["value"]) { return; };
    var update = {};

    if (eventinfo["value"] === "l1-welcome" || eventinfo["value"] === "l1-cancel") {
        update["l1mancer_status"] = "completed";
        update["charactermancer_step"] = "l1-welcome";
        deleteCharmancerData(["l1-welcome", "l1-race", "l1-class", "l1-abilities", "l1-background", "l1-equipment", "l1-spells", "l1-summary"]);
    }
    else if (eventinfo["value"].substring(0, 3) === "l1-") {
        update["l1mancer_status"] = eventinfo["value"];
    }
    else if (eventinfo["value"] === "lp-welcome" || eventinfo["value"] === "lp-cancel") {
        update["lpmancer_status"] = "";
        update["charactermancer_step"] = "";
        deleteCharmancerData(["lp-welcome", "lp-levels", "lp-choices", "lp-asi", "lp-spells", "lp-summary"]);
    }
    else if (eventinfo["value"].substring(0, 3) === "lp-") {
        update["charactermancer_step"] = "";
        update["lpmancer_status"] = "";
    };
    setAttrs(update);
});

on("change:licensedsheet", function (eventinfo) {
    //debugger
});

/* on("sheet:opened", function(eventinfo) {
    getAttrs([licensedsheet], function (v) {
        debugger
    });
}); */
var v2_old_values_check = function () {
    // update_attacks("all");
    var update = {};
    var attrs = ["simpletraits", "features_and_traits", "initiative_bonus", "npc", "character_id"];
    getSectionIDs("repeating_spell-npc", function (idarray) {
        _.each(idarray, function (id) {
            attrs.push("repeating_spell-npc_" + id + "_rollcontent");
        });
        getAttrs(attrs, function (v) {
            if (v["npc"] && v["npc"] == 1 && (!v["initiative_bonus"] || v["initiative_bonus"] == 0)) {
                update_initiative();
            }
            var spellflag = idarray && idarray.length > 0 ? 1 : 0;
            var missing = v["features_and_traits"] && v["simpletraits"] === "complex" ? 1 : 0;
            update["npcspell_flag"] = spellflag;
            update["missing_info"] = missing;
            _.each(idarray, function (id) {
                var content = v["repeating_spell-npc_" + id + "_rollcontent"];
                if (content.substring(0, 3) === "%{-" && content.substring(22, 41) === " | repeating_attack_ - " && content.substring(60, 68) === "_attack}") {
                    var thisid = content.substring(2, 21);
                    if (thisid != v["character_id"]) {
                        update["repeating_spell-npc_" + id + "_rollcontent"] = content.substring(0, 2) + v["character_id"] + content.substring(22, 68);
                    }
                }
            });
            setAttrs(update);
        });

    });

};

var clear_npc_spell_attacks = function (complete) {
    getSectionIDs("repeating_attack", function (attack_ids) {
        var getList = [];
        var done = false;
        _.each(attack_ids, function (id) {
            getList.push(`repeating_attack_${id}_spellid`);
        });
        getAttrs(getList, function (v) {
            _.each(attack_ids, function (id) {
                if (v[`repeating_attack_${id}_spellid`] && v[`repeating_attack_${id}_spellid`].indexOf("npc_") != -1) {
                    removeRepeatingRow(`repeating_attack_${id}`);
                }
            });
            complete();
        });
    });
}

var upgrade_to_2_0 = function (doneupdating) {
    getAttrs(["npc", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "strength_base", "dexterity_base", "constitution_base", "intelligence_base", "wisdom_base", "charisma_base", "deathsavemod", "death_save_mod", "npc_str_save", "npc_dex_save", "npc_con_save", "npc_int_save", "npc_wis_save", "npc_cha_save", "npc_str_save_base", "npc_dex_save_base", "npc_con_save_base", "npc_int_save_base", "npc_wis_save_base", "npc_cha_save_base", "npc_acrobatics_base", "npc_animal_handling_base", "npc_arcana_base", "npc_athletics_base", "npc_deception_base", "npc_history_base", "npc_insight_base", "npc_intimidation_base", "npc_investigation_base", "npc_medicine_base", "npc_nature_base", "npc_perception_base", "npc_performance_base", "npc_persuasion_base", "npc_religion_base", "npc_sleight_of_hand_base", "npc_stealth_base", "npc_survival_base", "npc_acrobatics", "npc_animal_handling", "npc_arcana", "npc_athletics", "npc_deception", "npc_history", "npc_insight", "npc_intimidation", "npc_investigation", "npc_medicine", "npc_nature", "npc_perception", "npc_performance", "npc_persuasion", "npc_religion", "npc_sleight_of_hand", "npc_stealth", "npc_survival"], function (v) {
        var update = {};
        var stats = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
        var npc_stats = ["npc_str_save", "npc_dex_save", "npc_con_save", "npc_int_save", "npc_wis_save", "npc_cha_save", "npc_acrobatics", "npc_animal_handling", "npc_arcana", "npc_athletics", "npc_deception", "npc_history", "npc_insight", "npc_intimidation", "npc_investigation", "npc_medicine", "npc_nature", "npc_perception", "npc_performance", "npc_persuasion", "npc_religion", "npc_sleight_of_hand", "npc_stealth", "npc_survival"];
        _.each(stats, function (attr) {
            if (v[attr] && v[attr] != "10" && v[attr + "_base"] == "10") {
                update[attr + "_base"] = v[attr];
            }

        });
        _.each(npc_stats, function (attr) {
            if (v[attr] && !isNaN(v[attr]) && v[attr + "_base"] == "") {
                update[attr + "_base"] = v[attr];
            }

        });
        if (v["deathsavemod"] && v["deathsavemod"] != "0" && v["death_save_mod"] === "0") { v["death_save_mod"] = v["deathsavemod"]; };

        if (v["npc"] && v["npc"] == "1") {
            var callback = function () {
                update_attr("all");
                update_mod("strength");
                update_mod("dexterity");
                update_mod("constitution");
                update_mod("intelligence");
                update_mod("wisdom");
                update_mod("charisma");
                update_npc_action("all");
                update_npc_saves();
                update_npc_skills();
                update_initiative();
            }
        }
        else {
            var callback = function () {
                update_attr("all");
                update_mod("strength");
                update_mod("dexterity");
                update_mod("constitution");
                update_mod("intelligence");
                update_mod("wisdom");
                update_mod("charisma");
                update_all_saves();
                update_skills(["athletics", "acrobatics", "sleight_of_hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal_handling", "insight", "medicine", "perception", "survival", "deception", "intimidation", "performance", "persuasion"]);
                update_tool("all")
                update_attacks("all");
                update_pb();
                update_jack_attr();
                update_initiative();
                update_weight();
                update_spell_info();
                update_ac();
            }
        }

        setAttrs(update, { silent: true }, callback);
        doneupdating();
    });
};

var upgrade_to_2_1 = function (doneupdating) {
    v2_old_values_check();
    doneupdating();
};

var upgrade_to_2_2 = function (doneupdating) {
    setAttrs({ l1mancer_status: "completed" }, function (eventinfo) {
        setAttrs({ "options-class-selection": "0" });
        console.log("Preprocessed v2.2 upgrade");
        update_tool("all");
        update_attacks("all");
        update_class();
        update_race_display();
        doneupdating();
    });
};

var upgrade_to_2_3 = function (doneupdating) {
    getSectionIDs("damagemod", function (ids) {
        var update = {};
        _.each(ids, function (rowid) {
            update[`repeating_damagemod_${rowid}_options-flag`] = "0";
        });
        getSectionIDs("tohitmod", function (ids) {
            _.each(ids, function (rowid) {
                update[`repeating_tohitmod_${rowid}_options-flag`] = "0";
            });
            setAttrs(update);
            doneupdating();
        });
    });
};

var upgrade_to_2_4 = function (doneupdating) {
    clear_npc_spell_attacks(function () {
        update_globalskills(function () {
            update_globalsaves(function () {
                update_globalattack(function () {
                    update_globaldamage(function () {
                        getAttrs(["npc", "npcspellcastingflag", "spellcasting_ability", "caster_level", "level_calculations"], function (v) {
                            if (v.npc == "1" && v.npcspellcastingflag == "1") {
                                getSectionIDs("npctrait", function (secIds) {
                                    var getList = [];
                                    _.each(secIds, function (x) {
                                        getList.push("repeating_npctrait_" + x + "_name");
                                        getList.push("repeating_npctrait_" + x + "_desc");
                                    });
                                    getAttrs(getList, function (traits) {
                                        var update = {};
                                        if (v.spellcasting_ability == "0*" || v.caster_level == "0") {
                                            var spellSec = "";
                                            if (v.spellcasting_ability == "0*") {
                                                update.spellcasting_ability = "@{intelligence_mod}+";
                                            }
                                            _.each(secIds, function (traitId) {
                                                if (traits["repeating_npctrait_" + traitId + "_name"].toLowerCase().includes("spellcasting.")) spellSec = traitId;
                                            });
                                            if (spellSec != "") {
                                                var spellcasting = traits["repeating_npctrait_" + spellSec + "_desc"].toLowerCase();
                                                if (v.spellcasting_ability == "0*") {
                                                    var lastIndex = 9999;
                                                    _.each(["intelligence", "wisdom", "charisma"], function (ability) {
                                                        var found = spellcasting.indexOf(ability);
                                                        if (found > -1 && found < lastIndex) {
                                                            lastIndex = found;
                                                            update.spellcasting_ability = "@{" + ability + "_mod}+";
                                                        }
                                                    });
                                                }
                                                if (v.caster_level == "0") {
                                                    var foundLevelidx = spellcasting.search(/(\d|\d\d)(st|nd|rd|th)/);
                                                    if (foundLevelidx) {
                                                        var level = parseInt(spellcasting.substring(foundLevelidx, foundLevelidx + 4));
                                                        console.log(`Found spellcasting level ${level} in trait, setting caster_level...`);
                                                        update.caster_level = level;
                                                    }
                                                }
                                            }
                                        }
                                        setAttrs(update, function () {
                                            // Recalculate spell slots in case NPC level was restored
                                            if (!v["level_calculations"] || v["level_calculations"] == "on") {
                                                update_spell_slots();
                                            };
                                            // Set all spells without a given modifier to 'spell'
                                            var spgetList = [];
                                            getSectionIDs("spell-cantrip", function (secIds0) {
                                                _.each(secIds0, function (x) {
                                                    spgetList.push("repeating_spell-cantrip_" + x + "_spell_ability");
                                                });
                                                getSectionIDs("spell-1", function (secIds1) {
                                                    _.each(secIds1, function (x) {
                                                        spgetList.push("repeating_spell-1_" + x + "_spell_ability");
                                                    });
                                                    getSectionIDs("spell-2", function (secIds2) {
                                                        _.each(secIds2, function (x) {
                                                            spgetList.push("repeating_spell-2_" + x + "_spell_ability");
                                                        });
                                                        getSectionIDs("spell-3", function (secIds3) {
                                                            _.each(secIds3, function (x) {
                                                                spgetList.push("repeating_spell-3_" + x + "_spell_ability");
                                                            });
                                                            getSectionIDs("spell-4", function (secIds4) {
                                                                _.each(secIds4, function (x) {
                                                                    spgetList.push("repeating_spell-4_" + x + "_spell_ability");
                                                                });
                                                                getSectionIDs("spell-5", function (secIds5) {
                                                                    _.each(secIds5, function (x) {
                                                                        spgetList.push("repeating_spell-5_" + x + "_spell_ability");
                                                                    });
                                                                    getSectionIDs("spell-6", function (secIds6) {
                                                                        _.each(secIds6, function (x) {
                                                                            spgetList.push("repeating_spell-6_" + x + "_spell_ability");
                                                                        });
                                                                        getSectionIDs("spell-7", function (secIds7) {
                                                                            _.each(secIds7, function (x) {
                                                                                spgetList.push("repeating_spell-7_" + x + "_spell_ability");
                                                                            });
                                                                            getSectionIDs("spell-8", function (secIds8) {
                                                                                _.each(secIds8, function (x) {
                                                                                    spgetList.push("repeating_spell-8_" + x + "_spell_ability");
                                                                                });
                                                                                getSectionIDs("spell-9", function (secIds9) {
                                                                                    _.each(secIds9, function (x) {
                                                                                        spgetList.push("repeating_spell-9_" + x + "_spell_ability");
                                                                                    });
                                                                                    getAttrs(spgetList, function (spellAbilities) {
                                                                                        spupdate = {};
                                                                                        _.each(spellAbilities, function (ability, attributeName) {
                                                                                            if (ability == "0*") {
                                                                                                console.log("UPDATING SPELL: " + attributeName);
                                                                                                spupdate[attributeName] = "spell";
                                                                                            }
                                                                                        });
                                                                                        setAttrs(spupdate, function () {
                                                                                            update_attacks("spells");
                                                                                            update_challenge();
                                                                                            doneupdating();
                                                                                        });
                                                                                    });
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            } else if (v.npc != "1") {
                                doneupdating();
                            } else {
                                doneupdating();
                            }
                        });
                    });
                });
            });
        });
    });
};

var upgrade_to_2_5 = function (doneupdating) {
    getAttrs(["globalacmod"], function (v) {
        var update = {};
        if (v.globalacmod && v.globalacmod != "0") {
            var rowid = generateRowID();
            update[`repeating_acmod_${rowid}_global_ac_val`] = parseInt(v.globalacmod);
            update[`repeating_acmod_${rowid}_global_ac_name`] = "GLOBAL ARMOR CLASS MODIFIER";
            update[`repeating_acmod_${rowid}_global_ac_active_flag`] = "1";
            update[`repeating_acmod_${rowid}_options-flag`] = "0";
            update["global_ac_mod_flag"] = "1";
        }
        setAttrs(update, { silent: true }, function () {
            update_ac();
            doneupdating();
        });
    });
};

var upgrade_to_2_6 = function (doneupdating) {
    getSectionIDs("hpmod", function (ids) {
        var getArray = [];
        _.each(ids, function (sectionid) {
            getArray.push("repeating_hpmod_" + sectionid + "_source");
        });
        getAttrs(getArray, function (v) {
            _.each(v, function (val, key) {
                if (val === "CON") removeRepeatingRow("repeating_hpmod_" + key.split("_")[2]);
            });
            doneupdating();
        });
    });
};

var upgrade_to_2_7 = function (doneupdating) {
    getSectionIDs("damagemod", function (ids) {
        console.log("Version 2.7 UPGRADE");
        let getArray = [];
        ids.forEach(sectionid => {
            getArray.push(`repeating_damagemod_${sectionid}_global_damage_rollstring`);
            getArray.push(`repeating_damagemod_${sectionid}_global_damage_type`);
        });
        getSectionIDs("savemod", function (ids) {
            _.each(ids, (sectionid) => {
                getArray.push(`repeating_savemod_${sectionid}_global_save_rollstring`);
            });
            getSectionIDs("tohitmod", function (ids) {
                _.each(ids, (sectionid) => {
                    getArray.push(`repeating_tohitmod_${sectionid}_global_attack_rollstring`);
                });
                getSectionIDs("skillmod", function (ids) {
                    _.each(ids, (sectionid) => {
                        getArray.push(`repeating_skillmod_${sectionid}_global_skill_rollstring`);
                    });
                    getAttrs(getArray, function (v) {
                        let set = {};
                        _.each(v, (value, attr) => {
                            if (_.last(attr.split("_")) === "rollstring") {
                                const section = attr.slice(0, -10);
                                const brackets = value.split('['), roll = brackets[0];
                                let name = brackets[1] ? brackets[1].slice(0, -1) : "";
                                if (attr.split("_")[1] == "damagemod") {
                                    name = name ? name : v[`${section}type`];
                                    set[`${section}damage`] = roll;
                                } else {
                                    set[`${section}roll`] = roll;
                                }
                                set[`${section}name`] = name;
                            }
                        });
                        setAttrs(set);

                        doneupdating();
                    });
                });
            });
        });
    });
};

var no_version_bugfix = function (doneupdating) {
    getAttrs(["npc", "class"], function (v) {
        if (v["npc"] && v["npc"] != "0" || v["class"] && v["class"] != "") {
            setAttrs({ version: "2.1" });
        }
        else {
            setAttrs({ version: "2.3" }, { silent: true });
        }
    });
    doneupdating();
};

var versioning = function (finished) {
    getAttrs(["version"], function (v) {
        const version = parseFloat(v["version"]) || 0.0;
        if (version >= "2.7") {
            setAttrs({ version: "2.7" }, function () {
                finished();
            });
            console.log("5th Edition OGL by Roll20 v" + v["version"]);
            return;
        }
        else if (!version || version === "") {
            console.log("NO VERSION FOUND");
            no_version_bugfix(function () {
                versioning(finished);
            });
        }
        else if (version >= "2.6") {
            console.log("UPGRADING TO v2.7");
            upgrade_to_2_7(function () {
                setAttrs({ version: "2.7" }, function () {
                    versioning(finished);
                });
            });
        }
        else if (version >= "2.5") {
            console.log("UPGRADING TO v2.6");
            upgrade_to_2_6(function () {
                setAttrs({ version: "2.6" }, function () {
                    versioning(finished);
                });
            });
        }
        else if (version >= "2.4") {
            console.log("UPGRADING TO v2.5");
            upgrade_to_2_5(function () {
                setAttrs({ version: "2.5" }, function () {
                    versioning(finished);
                });
            });
        }
        else if (version >= "2.3") {
            console.log("UPGRADING TO v2.4");
            upgrade_to_2_4(function () {
                setAttrs({ version: "2.4" }, function () {
                    versioning(finished);
                });
            });
        }
        else if (version >= "2.2") {
            console.log("UPGRADING TO v2.3");
            upgrade_to_2_3(function () {
                setAttrs({ version: "2.3" }, function () {
                    versioning(finished);
                });
            });
        }
        else if (version >= "2.1") {
            console.log("UPGRADING TO v2.2");
            upgrade_to_2_2(function () {
                setAttrs({ version: "2.2" }, function () {
                    versioning(finished);
                });
            });
        }
        else if (version >= "2.0") {
            console.log("UPGRADING TO v2.1");
            upgrade_to_2_1(function () {
                setAttrs({ version: "2.1" }, function () {
                    versioning(finished);
                });
            });
        }
        else {
            console.log("UPGRADING TO v2.0");
            upgrade_to_2_0(function () {
                setAttrs({ version: "2.0" }, function () {
                    versioning(finished);
                });
            });
        };
    });
};
/*********************************************************************/
/*********************************************************************/
/******                                                         ******/
/******                 CHARACTERMANCER WORKERS                 ******/
/******                                                         ******/
/*********************************************************************/
/*********************************************************************/

var proficiencyList = ["Weapon", "Armor", "Skill", "Tool", "Language"];
var abilityList = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
var changeListeners = "mancerchange:race_ability_choice1 mancerchange:race_ability_choice2 mancerchange:subrace_ability_choice1 mancerchange:subrace_ability_choice2 mancerchange:custom_hit_die mancerchange:feat_ability_choice";
var proficiencyNum = 4;
var customListeners = "";
_.each(abilityList, function (ability) {
    changeListeners += " mancerchange:race_custom_" + ability.toLowerCase();
    changeListeners += " mancerchange:subrace_custom_" + ability.toLowerCase();
});

/* HELPER FUNCTIONS */
var recalcData = function (data) {
    //Sets all the text in the top bar, returns ability information
    var update = { "hit_points": "-" };
    var allAbilities = { race: {}, subrace: {}, feat: {} };
    var disableAbilities = { race: [], subrace: [], feat: [] };
    var allProficiencies = {};
    var toSet = {};
    var mancerdata = data || getCharmancerData();
    var additionalHP = 0;

    if (mancerdata["l1-class"] && mancerdata["l1-class"].data.class && mancerdata["l1-class"].data.class["Suggested Abilities"]) {
        update["class_suggested_abilities"] = mancerdata["l1-class"].data.class["Suggested Abilities"];
        showChoices(["class_suggested_abilities_container"]);
    } else {
        update["class_suggested_abilities"] = "";
        hideChoices(["class_suggested_abilities_container"]);
    }
    if (mancerdata["l1-class"] && mancerdata["l1-class"].data.class && mancerdata["l1-class"].data.class["Spellcasting Ability"]) {
        update["class_spellcasting_ability"] = mancerdata["l1-class"].data.class["Spellcasting Ability"];
        showChoices(["class_spellcasting_ability_container"]);
    } else {
        update["class_spellcasting_ability"] = "";
        hideChoices(["class_spellcasting_ability_container"]);
    }

    _.each(mancerdata, function (page) {
        _.each(page.values, function (value, name) {
            if (name.search("ability") !== -1) {
                var choiceSection = name.split("_")[0];
                if (page.data[choiceSection] && page.data[choiceSection]["data-Ability Score Choice"]) {
                    var increase = 1;
                    if (typeof page.data[choiceSection]["data-Ability Score Choice"] == "string") {
                        increase = parseInt(_.last(page.data[choiceSection]["data-Ability Score Choice"].split("+")));
                    }
                    allAbilities[choiceSection] = allAbilities[choiceSection] || {};
                    allAbilities[choiceSection][value.toLowerCase()] = increase;
                    disableAbilities[choiceSection] = disableAbilities[choiceSection] || [];
                    disableAbilities[choiceSection].push(value);
                }
            }
        });
        _.each(page.data, function (pagedata, increaseSection) {
            if (pagedata["data-Ability Score Increase"]) {
                _.each(pagedata["data-Ability Score Increase"], function (amount, ability) {
                    allAbilities[increaseSection] = allAbilities[increaseSection] || {};
                    allAbilities[increaseSection][ability.toLowerCase()] = amount;
                    disableAbilities[increaseSection] = disableAbilities[increaseSection] || [];
                    disableAbilities[increaseSection].push(ability.toLowerCase());
                });
            }
            //TODO: Investigate if additional hitpoits at first level could be calculated and interted at this point
            //By Miguel
            if (pagedata["data-HP per level"]) {
                additionalHP += pagedata["data-HP per level"];
            }
        });
    });
    if (mancerdata["l1-race"] && mancerdata["l1-race"].values.race == "Rules:Races") {
        _.each(abilityList, function (ability) {
            var custom = mancerdata["l1-race"].values["race_custom_" + ability.toLowerCase()] || false;
            if (custom) {
                allAbilities.race[ability.toLowerCase()] = parseInt(custom);
            }
        });
    }
    if (mancerdata["l1-race"] && mancerdata["l1-race"].values.subrace == "Rules:Races") {
        _.each(abilityList, function (ability) {
            var custom = mancerdata["l1-race"].values["subrace_custom_" + ability.toLowerCase()] || false;
            if (custom) {
                allAbilities.subrace[ability.toLowerCase()] = parseInt(custom);
            }
        });
    }
    var abilityTotals = {};
    _.each(allAbilities, function (abilities) {
        _.each(abilities, function (amount, ability) {
            abilityTotals[ability] = abilityTotals[ability] || { bonus: 0 };
            abilityTotals[ability].bonus += parseInt(amount);
        });
    });
    _.each(abilityList, function (upperAbility) {
        var ability = upperAbility.toLowerCase();
        abilityTotals[ability] = abilityTotals[ability] || { bonus: 0, mod: 0 };
        if (mancerdata["l1-abilities"] && mancerdata["l1-abilities"].values[ability]) {
            abilityTotals[ability].base = parseInt(mancerdata["l1-abilities"].values[ability].split("~")[0]);
        } else {
            abilityTotals[ability].base = 0;
        }
        abilityTotals[ability].total = abilityTotals[ability].bonus + abilityTotals[ability].base;
        abilityTotals[ability].mod = Math.floor((abilityTotals[ability].total - 10) / 2);
        update[ability + "_total"] = abilityTotals[ability].total == 0 ? "-" : abilityTotals[ability].total;
    });
    allAbilities.totals = abilityTotals;

    if (mancerdata["l1-class"] && (mancerdata["l1-class"].data.class || mancerdata["l1-class"].values["custom_hit_die"])) {
        var basehp = mancerdata["l1-class"].data.class ? mancerdata["l1-class"].data.class["Hit Die"] : mancerdata["l1-class"].values["custom_hit_die"];
        var conmod = abilityTotals.constitution.base > 0 ? abilityTotals.constitution.mod : 0;
        //Calculating additional hitpoints at first level from things like Draconic Bloodline ad Hill Dwarf
        //By Miguel
        let additionalHitPointsFromClassAndRaceAtFirstLevel = getAdditionalHitPointsFromClassAndRaceAtFirstLevel(getRelevantBlobs(mancerdata, '1', 'l1'));
        allAbilities.hp = parseInt(basehp.replace("d", "")) + additionalHitPointsFromClassAndRaceAtFirstLevel + additionalHP + conmod;
        update["hit_points"] = allAbilities.hp;
    }

    if (!data) {
        _.each(disableAbilities, function (disable, disablesection) {
            disableCharmancerOptions(disablesection + "_ability_choice1", disable);
            disableCharmancerOptions(disablesection + "_ability_choice2", disable);
        });
        setCharmancerText(update);
        setAttrs(toSet);
    }
    return allAbilities;
};

var getProficiencies = function (data, currentSlide, blobs) {
    //Disables taken proficiency choices, returns proficiency info
    var auto = {};
    var allProficiencies = { "Weapon": [], "Armor": [], "Skill": [], "Tool": [], "Language": [], "Expertise": [] };
    var toSet = {};
    var mancerdata = data || getCharmancerData();
    var thismancer = currentSlide && currentSlide != "finish" ? currentSlide.split("-")[0] : "l1";
    if (!blobs) {
        blobs = thismancer == "l1" ? blobs = getRelevantBlobs(mancerdata, "1", "l1") : blobs = getAllLpBlobs(data, true);
    }
    if (thismancer !== "l1") allProficiencies = data["lp-welcome"].values["previous_proficiencies"] ? JSON.parse(data["lp-welcome"].values["previous_proficiencies"]) : allProficiencies;
    currentSlide = currentSlide == "lp-finish" ? "finish" : currentSlide;
    //For this first part, we're only concerned with choices that have already been made
    //Get all of the "automatic" proficiencies
    _.each(blobs.sorted, function (blobarray, section) {
        _.each(blobarray, function (blob) {
            _.each(proficiencyList, function (prof) {
                if (blob[prof + " Proficiency"]) {
                    var json = JSON.parse(blob[prof + " Proficiency"]);
                    if (json.Proficiencies) {
                        auto[section] = auto[section] ? auto[section].concat(json.Proficiencies) : json.Proficiencies;
                        allProficiencies[prof] = allProficiencies[prof].concat(json.Proficiencies);
                    }
                }
            });
            if (blob.Expertise) {
                var json = JSON.parse(blob.Expertise);
                if (json.Proficiencies) {
                    allProficiencies.Expertise = allProficiencies.Expertise.concat(json.Proficiencies);
                }
            }
        });
    });
    //Gather all of the chosen proficiencies
    _.each(mancerdata, function (slide, slidename) {
        if (slidename.split("-")[0] == thismancer) {
            _.each(proficiencyList, function (prof) {
                _.each(slide.values, function (value, name) {
                    if (name.split("_")[3] == prof.toLowerCase() && name.split("_")[4] == "choice") {
                        if (value != "custom") allProficiencies[prof].push(value.split(":")[1]);
                    }
                });
            });
            //Get a list of chosen expertise
            _.each(slide.values, function (value, name) {
                if (name.substr(-16) == "expertise_choice") {
                    allProficiencies.Expertise.push(value.split(":")[1]);
                }
            });
        }
    });
    //Gather proficiencies from custom choices
    _.each(mancerdata, function (slide, slidename) {
        if (slidename.split("-")[0] == thismancer) {
            _.each(slide.values, function (value, name) {
                if (name.substr(-18) == "proficiency_choice") {
                    if (value != "custom") allProficiencies[slide.values[name.replace("choice", "type")]].push(value.split(":")[1]);
                }
            });
        }
    });
    //If the expertise choice is from the "known" list, make sure the choice is still available
    //Reset to "" if not available. Don't do this if we're applying changes
    if (currentSlide != "finish") {
        _.each(mancerdata, function (slide, slidename) {
            if (slidename.split("-")[0] == thismancer) {
                _.each(slide.values, function (value, name) {
                    if (name.substr(-16) == "expertise_choice" && slide.values[name.replace("choice", "info")]) {
                        if (!(allProficiencies.Skill.includes(value.split(":")[1]) || allProficiencies.Tool.includes(value.split(":")[1]))) {
                            toSet[name] = "";
                        }
                    }
                });
            }
        });
        setAttrs(toSet);
    }
    if (currentSlide && currentSlide != "finish") {
        //Now we need to know all of the selects, even if a choice hasn't been made
        //Getting a list of all the relevant selects
        var repsecs = { "Weapon": [], "Armor": [], "Skill": [], "Tool": [], "Language": [] };
        var repexp = [];
        _.each(mancerdata[currentSlide].repeating, function (id) {
            _.each(proficiencyList, function (prof) {
                if (_.last(id.split("_")) == prof.toLowerCase()) repsecs[prof].push(id);
            });
            if (_.last(id.split("_")) == "expertise") repexp.push(id);
            if (_.last(id.split("_")) == "proficiency") {
                if (mancerdata[currentSlide].values[id + "_type"]) repsecs[mancerdata[currentSlide].values[id + "_type"]].push(id);
            }
        })
        //Disable already chosen proficiencies
        _.each(proficiencyList, function (prof) {
            _.each(repsecs[prof], function (id) {
                disableCharmancerOptions(id + "_choice", allProficiencies[prof], { category: "Proficiencies" });
            });
        });
        //Disable already chosen expertise, rebuild options if choice is from "known" list
        _.each(repexp, function (id) {
            if (mancerdata[currentSlide].values[id + "_info"]) {
                var choices = allProficiencies.Skill;
                var options = JSON.parse(mancerdata[currentSlide].values[id + "_info"]);
                var settings = { category: "Proficiencies", disable: allProficiencies.Expertise, silent: true };
                options.shift();
                settings.add = options;
                setCharmancerOptions(id + "_choice", choices, settings);
            } else {
                disableCharmancerOptions(id + "_choice", allProficiencies.Expertise, { category: "Proficiencies" });
            }
        });
    };
    _.each(allProficiencies, function (section, name) {
        allProficiencies[name] = _.without(section, "");
    });
    return ({ auto: auto, all: allProficiencies });
};

var handleAbilities = function (data, section) {
    var showList = [];
    if (data["data-Ability Score Increase"]) {
        showList.push(section + "_abilities");
    }
    if (data["data-Ability Score Choice"]) {
        showList.push(section + "_abilities");
        showList.push(section + "_ability_choice1");
        if (data["data-Ability Score Choice"].split("+")[0] == "2") {
            showList.push(section + "_ability_choice2");
        }
    };
    return showList;
};

var knownSpells = function (data) {
    var mancerdata = data ? data : getCharmancerData();
    var allSpells = {
        race: false,
        class: false,
        known: [],
        all: [],
        errors: { class: [], race: [] }
    };
    var stats = recalcData(data); //since this can get called in the finish step, make sure it doesn't call setAttrs()
    var racename = getName("race", mancerdata, true);
    var subracename = getName("subrace", mancerdata, true);
    var classname = getName("class", mancerdata, true);
    var subclassname = getName("subclass", mancerdata, true);
    var classAbility = mancerdata["l1-class"] && mancerdata["l1-class"].data.class && mancerdata["l1-class"].data.class["Spellcasting Ability"] ? mancerdata["l1-class"].data.class["Spellcasting Ability"] : "";
    var expandedList = {};
    var additionalList = {};
    var blobs = getRelevantBlobs(mancerdata, "1", "l1");

    //First look through all Blobs for any blob.Spells
    _.each(blobs.all, function (blob) {
        if (blob.Spells) {
            var spells = JSON.parse(blob.Spells);
            //Examine each spell to determine if it is "Extended List". "Extended List" adds to the classes spell list.
            //Ravnica Guilds backgrounds such as Dimir Operative are examples of this
            _.each(spells, function (spell) {
                if (spell["Expanded List"]) {
                    expandedList[spell.Level] = expandedList[spell.Level] ? expandedList[spell.Level].concat(spell["Expanded List"]) : spell["Expanded List"];
                }
            });
        }
    });
    //Look through blobs.sorted.
    _.each(blobs.sorted, function (sectionblobs, section) {
        //Subclass needs to be changed to class.
        var parentsection = section.replace("sub", "");
        additionalList[parentsection] = additionalList[parentsection] || []
        //Examine eaach blob for "Additional Spell List"
        _.each(sectionblobs, function (blob) {
            if (blob["Additional Spell List"]) {
                additionalList[parentsection].push(blob["Additional Spell List"]);
            }
        });
    });
    //Process spell data from blobs
    _.each(blobs.sorted, function (sectionblobs, section) {
        var parentsection = section.replace("sub", "");
        _.each(sectionblobs, function (blob) {
            //Looks through the blobs for Spells attribute
            //class.Spells contains the information for how many spells are choosen at each level & Prepared spells to be selected based on ability modifer + 1
            //[subclass, background, race}.Spells will contain KNOWN, CHOSEN, or EXPANDED LIST for extra spells granted by these sections
            if (blob.Spells) {
                var spells = JSON.parse(blob.Spells);
                allSpells[parentsection] = allSpells[parentsection] || { known: [], choices: [] }
                _.each(spells, function (spell) {
                    var numSpells = 0;
                    expandedList[spell.Level] = expandedList[spell.Level] || [];
                    //class.Spells will contain Prepared and Choose.
                    //These are used to populate the number of selects needed for each spell lists on the Spells slide
                    if (spell.Prepared) {
                        numSpells = Math.max(stats.totals[spell.Prepared.split("+")[0].toLowerCase()].mod, 0) + parseInt(spell.Prepared.split("+")[1]);
                    }
                    if (spell.Choose) {
                        numSpells = parseInt(spell.Choose);
                    }
                    //If Spells are to be Chosen or Prepared add them to a class list, expand the list, and set the Ability modifier & Level
                    if (numSpells > 0) {
                        _.times(numSpells, function (n) {
                            var thisspell = { Level: parseInt(spell.Level) };
                            thisspell.List = spell.List ? spell.List : classname;
                            thisspell.AddList = additionalList[parentsection];
                            thisspell.Ability = spell.Ability ? spell.Ability : classAbility;
                            if (parentsection == "class") thisspell["Expanded List"] = expandedList[spell.Level];
                            allSpells[parentsection].choices.push(thisspell);
                        });
                    }
                    //Add any spells that are already known from sections such as Forge Domain Cleric starts with identify & searing smite
                    _.each(spell.Known, function (known) {
                        var thisspell = { Name: known, Level: parseInt(spell.Level) };
                        thisspell.Ability = spell.Ability ? spell.Ability : classAbility;
                        thisspell.Source = parentsection;
                        allSpells[parentsection].known.push(thisspell);
                        allSpells.known.push(known);
                        allSpells.all.push(thisspell);
                    });
                });
            }
        });
    });
    //Collect custom race/subrace spells
    if (mancerdata["l1-race"] && mancerdata["l1-race"].values.custom_race_spell_ability) {
        var raceAbility = mancerdata["l1-race"].values.custom_race_spell_ability;
        var numSpells = mancerdata["l1-race"].values.custom_race_spell_number;
        var spellList = mancerdata["l1-race"].values.custom_race_spell_list;
        if (spellList) {
            allSpells.race = allSpells.race || { known: [], choices: [] }
            for (var x = 1; x <= numSpells; x++) {
                var thisSpell = {
                    Ability: raceAbility,
                    Level: 0,
                    List: spellList
                };
                allSpells.race.choices.push(thisSpell);
            }
        } else {
            allSpells.errors.race.push("custom_race_spell_list");
        }
    }
    //Collect custom class spells
    if (mancerdata["l1-class"] && mancerdata["l1-class"].values.custom_class_spell_ability) {
        var customAbility = mancerdata["l1-class"].values.custom_class_spell_ability;
        var customList = mancerdata["l1-class"].values.custom_class_spell_list;
        var customSpells = { "0": mancerdata["l1-class"].values.custom_class_cantrip_number, "1": mancerdata["l1-class"].values.custom_class_spell_number };
        if (customList && (customSpells["0"] > 0 || customSpells["1"] > 0)) {
            allSpells.class = allSpells.class || { known: [], choices: [] }
            _.each(customSpells, function (number, level) {
                for (var x = 1; x <= number; x++) {
                    var thisSpell = {
                        Ability: customAbility,
                        Level: level,
                        List: customList
                    };
                    allSpells.class.choices.push(thisSpell);
                }
            });
        } else {
            allSpells.errors.class.push("custom_class_spell_list");
            allSpells.errors.class.push("custom_class_spell_number");
        }
    }
    //Collect custom subclass spells
    if (mancerdata["l1-class"] && mancerdata["l1-class"].values.subclass == "Rules:Classes") {
        var customSpells = { "0": mancerdata["l1-class"].values.custom_subclass_cantrip_number, "1": mancerdata["l1-class"].values.custom_subclass_spell_number };
        if (customSpells["0"] > 0 || customSpells["1"] > 0) {
            allSpells.class = allSpells.class || { known: [], choices: [] }
            _.each(customSpells, function (number, level) {
                var customList = classname.toLowerCase();
                if (level == "0" && mancerdata["l1-class"].values.custom_subclass_cantrip_list) customList = mancerdata["l1-class"].values.custom_subclass_cantrip_list;
                if (level == "1" && mancerdata["l1-class"].values.custom_subclass_spell_list) customList = mancerdata["l1-class"].values.custom_subclass_spell_list;
                for (var x = 1; x <= number; x++) {
                    var thisSpell = {
                        Ability: classAbility,
                        Level: level,
                        List: customList
                    };
                    allSpells.class.choices.push(thisSpell);
                }
            });
        }
    }
    //Collect data from choices
    if (mancerdata["l1-spells"]) {
        _.each(mancerdata["l1-spells"].repeating, function (id) {
            if (mancerdata["l1-spells"].values[id + "_choice"]) {
                var thisspell = { Name: mancerdata["l1-spells"].values[id + "_choice"].substring(7) };
                thisspell.Ability = mancerdata["l1-spells"].values[id + "_info"] ? mancerdata["l1-spells"].values[id + "_info"] : classAbility;
                if (mancerdata["l1-spells"].values[id + "_custom"]) thisspell.Source = mancerdata["l1-spells"].values[id + "_custom"];
                allSpells.known.push(thisspell.Name);
                allSpells.all.push(thisspell);
            };
        });
    }
    return allSpells;
};

var cleanEquipment = function (equipment) {
    var current_string = "(";
    var hasDouble = false;
    var firstItem = true;
    _.each(equipment, function (item) {
        if (item.search("~DBL") != -1) {
            hasDouble = true;
            item.replace("~DBL", "");
        }
        item = item.replace(/"Item Type":(.|)Weapon.*\b/g, "Any Weapon");
        item = item.replace(/Subtype:(.|)Martial.*\b("|)/g, "Any Martial Weapon");
        item = item.replace(/Subtype:(.|)Simple.*\b("|)/g, "Any Simple Weapon");
        item = item.replace(/Subtype:(.|)Artisan's Tools.*\b("|)/g, "A Set of Artisan's Tools");
        item = item.replace(/Subtype:(.|)Gaming Set.*\b("|)/g, "A Gaming Set");
        item = item.replace(/Subtype:(.|)Musical Instrument.*\b("|)/g, "A Musical Instrument");
        if (!firstItem) current_string += " or ";
        current_string += item;
        firstItem = false;
    });
    current_string += ")";
    if (hasDouble) {
        current_string = "two of " + current_string;
    }
    return current_string.replace(/,/g, ", ");
};

const removeExpansionInfo = function (text) {
    return text.replace(/\??expansion\=([0-9]+)?/gi, "");
};

var removeDuplicatedPageData = function (data) {
    if (!Array.isArray(data)) return data;
    const getPageName = function (item) {
        let category = "";
        if ("data" in item && "Category" in item.data) category += item.data["Category"] + ": ";
        return category + item.name;
    }
    let seen = {};
    return data.filter(function (item) {
        let pageName = getPageName(item);
        return seen.hasOwnProperty(pageName) ? false : (seen[pageName] = true);
    })
};

var getName = function (request, data, custom) {
    data = data || getCharmancerData();
    var section = request.replace("sub", "");
    var result = "";
    var customString = custom ? "custom" : "";
    if (data["l1-" + section] && data["l1-" + section].values[request]) {
        result = data["l1-" + section].values[request + "_name"] || data["l1-" + section].values[request];
    }
    result = result.split(":")[0] == "Rules" || result.split(":")[0] == "CategoryIndex" ? customString : result;
    //Removing expansion name from result
    result = removeExpansionInfo(result);
    return _.last(result.split(":"));
};

var getGainedSpells = function () {
    let gainedSpells = [];
    const data = getCharmancerData();
    if ("lp-spells" in data && "values" in data["lp-spells"]) {
        Object.keys(data["lp-spells"].values).forEach(key => {
            let found = false;
            if (key.indexOf("_checked") === -1) return;
            let spellNameKey = key.replace("_checked", "_name");
            let spellName = data["lp-spells"].values[spellNameKey];
            if (data["lp-welcome"].values.spellinfo) {
                let previousSpells = JSON.parse(data["lp-welcome"].values.spellinfo);
                Object.keys(previousSpells).forEach(spell => {
                    if (previousSpells[spell].spellname === spellName) found = true;
                });
            }
            if (!found) gainedSpells.push(spellName);
        });
    }
    return gainedSpells;
};

var getGainedFeatures = function () {
    const data = getCharmancerData();
    if (!"lp-levels" in data) return;
    let gainedFeatures = [];
    for (let charclass = 1; charclass <= 4; charclass++) {
        let levelsGained = data["lp-levels"].values["class" + charclass + "_addlevel"] || 0;
        if (levelsGained === 0) continue; //No leves gained in this class,  just skip to the next one.

        //Now lets get the features got from each class at LP;
        levelsGained = parseInt(levelsGained);
        let currentLevel = parseInt(data["lp-levels"].values["class" + charclass + "_currentlevel"]);
        Object.keys(data["lp-levels"].data["class" + charclass].blobs).forEach(feature => {
            let featureLevel = parseInt(data["lp-levels"].data["class" + charclass].blobs[feature]["Level"]);
            if (featureLevel > currentLevel && featureLevel <= (currentLevel + levelsGained)) {
                let sanitizedFeatureName = feature.replace(/\(.+\)/g, "");
                sanitizedFeatureName = sanitizedFeatureName.replace(/ - .+/g, "").trim();
                if ("Group" in data["lp-levels"].data["class" + charclass].blobs[feature]) return;
                if ("Choice" in data["lp-levels"].data["class" + charclass].blobs[feature]) {
                    Object.keys(data["lp-choices"].values).forEach(info => {
                        if (data["lp-choices"].values[info] === feature) {
                            let choice = info.replace("_info", "_choice");
                            if (choice in data["lp-choices"].values) {
                                let choiceName = data["lp-choices"].values[choice].replace("Blob:", "");
                                if (gainedFeatures.indexOf(choiceName) === -1) gainedFeatures.push(choiceName);
                            }
                        }
                    });
                } else {
                    if (gainedFeatures.indexOf(sanitizedFeatureName) === -1) gainedFeatures.push(sanitizedFeatureName);
                }
            }
        });
    }
    return gainedFeatures;
};

var filterBlobs = function (blobs, filters) {
    var remove = filters.multiclass ? "no" : "yes";
    var results = {};
    delete filters.multiclass;
    delete filters.slide;
    _.each(blobs, function (blob, name) {
        var match = true;
        if (blob.Group && !filters.Group && !filters.name) match = false;
        _.each(filters, function (v, k) {
            if (k == "name") {
                if (name != v) match = false;
            } else if (v[0] === "<" && !isNaN(parseInt(v.substring(1)))) {
                let blobval = isNaN(parseInt(blob[k])) ? 0 : parseInt(blob[k]);
                if (blobval > parseInt(v.substring(1))) match = false;
            } else {
                if (blob[k] != v) match = false;
            }
        });
        if (match && name.split("(")[0].toLowerCase() != "spell slots") results[name] = blob;
    });
    _.each(results, function (blob, name) {
        if (blob.Multiclass == remove) {
            delete results[name];
        }
    });
    return results;
};

var handleBlobs = function (blobs, options) {
    //Old parameters: (blobs, filters, section, element, thisblob)

    //Function to get blob parameter for Spell Pickers like Magical Secrets
    //By Miguel
    const getBlobDescription = function (blob) {
        if ("Description" in blob) {
            return blob.Description;
        }
        else if ("Traits" in blob) {
            traits = JSON.parse(blob.Traits)[0];
            if ("Desc" in traits) return traits.Desc;
        }
        return "";
    }

    const handleProficiencies = function (data, subsection) {
        if (!data) {
            return;
        }
        subsection = subsection ? subsection : element
        _.each(proficiencyList, function (prof) {
            if (data[prof + " Proficiency"]) {
                addRepeatingSection(subsection, "row", function (rowid) {
                    var json = JSON.parse(data[prof + " Proficiency"]);
                    if (!json.Hidden) {
                        var repupdate = {};
                        repupdate[rowid + " label span"] = json.Title ? json.Title : getTranslationByKey(prof.toLowerCase() + "-proficiencies");
                        if (json.Desc) {
                            repupdate[rowid + " label p"] = json.Desc;
                            if (json.Proficiencies) {
                                repupdate[rowid + " label p"] += "<br>" + json.Proficiencies.join(", ");
                            }
                        } else if (json.Proficiencies) {
                            repupdate[rowid + " label p"] = json.Proficiencies.join(", ");
                        }
                        setCharmancerText(repupdate);
                    }
                    _.each(json.Choice, function (v) {
                        addRepeatingSection(rowid + " label", "choose", section + "_" + prof.toLowerCase(), function (id) {
                            var choices = "";
                            var settings = { category: "Proficiencies", disable: profdata.all[prof] };
                            if (prof == "Language") {
                                var customupdate = {};
                                customupdate[id + " select"] = '<option value="" data-i18n="choose"></option><option class="custom" value="custom" data-i18n="custom"></option>';
                                setCharmancerText(customupdate);
                            }
                            if (Array.isArray(v)) {
                                if (v[0].split(":").length > 1) {
                                    choices = "Category:Proficiencies \"Type:" + prof + "\" " + v.shift();
                                    settings.add = v;
                                } else if (v[0] == "all") {
                                    v.shift();
                                    choices = "Category:Proficiencies \"Type:" + prof + "\"";
                                    settings.add = v;
                                } else {
                                    choices = v;
                                }
                            } else {
                                choices = "Category:Proficiencies \"Type:" + prof + "\"";
                                if (v != "all" && v != "any") {
                                    console.log("MISSED THE ALL CHECK")
                                    console.log(v);
                                    choices += " " + v;
                                }
                            }
                            setCharmancerOptions(id + "_choice", choices, settings);
                        });
                    });
                });
            }
        });
        if (data.Expertise) {
            addRepeatingSection(subsection, "row", function (rowid) {
                var json = JSON.parse(data.Expertise);
                if (json.Title) {
                    var repupdate = {};
                    repupdate[rowid + " label span"] = json.Title;
                    setCharmancerText(repupdate);
                }
                _.each(json.Choice, function (v) {
                    addRepeatingSection(rowid + " label", "choose", section + "_expertise", function (id) {
                        var choices = "";
                        var settings = { category: "Proficiencies", disable: profdata.all.Expertise };
                        if (v[0].split(":").length > 1) {
                            choices = "Category:Proficiencies \"Type:" + prof + "\" " + v.shift();
                            settings.add = v;
                        } else if (v[0] == "KNOWN") {
                            var info = {};
                            info[id + "_info"] = JSON.stringify(v);
                            setAttrs(info);
                            v.shift();
                            choices = profdata.all.Skill;
                            settings.add = v;
                        } else {
                            choices = v;
                        }
                        setCharmancerOptions(id + "_choice", choices, settings);
                    });
                });
            });
        }
    };
    const handleTraits = function (blob, subsection, name) {
        var traits = JSON.parse(blob.Traits);
        subsection = subsection ? subsection : element;
        _.each(traits, function (trait) {
            if (trait["Input Spells"]) {
                addRepeatingSection(subsection, "utilityrow", function (rowid) {
                    let repupdate = {};
                    let set = {};
                    repupdate[`${rowid} label span .sheet-title`] = trait.Name.split("{{")[0];
                    if (!trait.Hide) repupdate[`${rowid} label p`] = trait.Desc;
                    repupdate[`${rowid} button`] = trait["Input Spells"].ButtonText;
                    set[`${rowid}_info`] = JSON.stringify(trait["Input Spells"]);
                    set[`${rowid}_type`] = "trait";
                    set[`${rowid}_blob`] = name;
                    set[`${rowid}_parent`] = options.parent;
                    set[`${rowid}_title`] = trait.Name;
                    set[`${rowid}_desc`] = trait.Desc;
                    setCharmancerText(repupdate);
                    setAttrs(set);
                });
            } else if (!trait.Hide) {
                addRepeatingSection(subsection, "row", function (rowid) {
                    let repupdate = {};
                    if (trait.Input) {
                        //Fixing custom data in inputs not being remembered when switching tabs (UC809)
                        //By Miguel
                        const data = getCharmancerData();
                        //The function below looks for valyes through all Mancer data that match a input rowid:
                        const getPreviousInputValue = function (data, rowid) {
                            let parsedId = rowid.match(/-.+_/g)[0];
                            for (let attribute in data) {
                                if (!("values" in data[attribute])) continue;
                                for (let key in data[attribute].values) {
                                    if (data[attribute].values.hasOwnProperty(key) && key.indexOf("_input") > -1 && key.indexOf(parsedId) > -1) {
                                        return data[attribute].values[key];
                                    }
                                }
                            }
                            return "";
                        }
                        const previousValue = getPreviousInputValue(data, rowid);
                        repupdate[`${rowid} label span`] = `<input type="text" name="comp_${rowid}_trait_input" value="${previousValue}">`;
                        repupdate[`${rowid} label span`] += `<input type="hidden" name="comp_${rowid}_trait_name" value="${(trait.Name ? trait.Name : "")}">`;
                        repupdate[`${rowid} label span`] += `<input type="hidden" name="comp_${rowid}_trait_desc" value="${(trait.Desc ? trait.Desc : "")}">`;
                        repupdate[`${rowid} label span`] += `<input type="hidden" name="comp_${rowid}_trait_section" value="${section}">`;
                    } else {
                        repupdate[`${rowid} label span`] = trait.Name;
                        repupdate[`${rowid} label p`] = blob.Prerequisite ? "<p class=\"prereq\"><span data-i18n=\"prerequisite:\"></span>" + blob.Prerequisite + "</p>" : "";
                        //Fixing undefined when selecting Ranger Favored Enemy and Land (UC809)
                        //By Miguel
                        repupdate[`${rowid} label p`] += (trait.Desc ? trait.Desc : "");
                    }
                    setCharmancerText(repupdate);
                    handleProficiencies(blob, rowid);
                });
            };
        });
    };
    const mancerdata = getCharmancerData();
    let filters = options.filters || {};
    let section = options.section || undefined;
    let thisblob = options.thisblob || undefined;
    let element = options.element ? options.element : section + "_holder";
    let sorted = { choices: {}, traits: {}, other: {}, spells: {} };
    let profdata = getProficiencies(mancerdata, options.slide);
    let filtered = {};
    if (thisblob) {
        filtered[thisblob] = blobs[thisblob];
    } else {
        filtered = filterBlobs(blobs, filters);
    }
    _.each(filtered, function (blob, name) {
        if (name.split(" ")[0] == "Proficiencies") {
            sorted.proficiencies = blob;
        } else if (blob["Pick Spells"]) {
            sorted.spells[name] = blob;
        } else if (blob.Choice) {
            sorted.choices[name] = blob;
        } else if (blob.Traits) {
            sorted.traits[name] = blob;
        } else {
            sorted.other[name] = blob;
        }
    });

    handleProficiencies(sorted.proficiencies);
    _.each(sorted.choices, function (blob, name) {
        addRepeatingSection(element, "row", function (rowid) {
            var title = blob.Title ? blob.Title : name;
            var choice = blob.Choice;
            var settings = {};
            let choicenum = blob["Choice Number"] ? parseInt(blob["Choice Number"]) : 1;
            if (blob.Choice.split(":")[0] == "Blob") {
                choice = Object.keys(filterBlobs(blobs, { Group: blob.Choice.split(":")[1], Level: ("<" + (options.maxlevel || blob.Level)) })).sort();
                settings.category = "Blob";
            }
            var repupdate = {};
            repupdate[rowid + " label span"] = title;
            if (blob.Description) {
                repupdate[rowid + " label p"] = blob.Description;
            }
            setCharmancerText(repupdate);
            if (section.indexOf("-") === -1) {
                let match = /[0-9]+$/.exec(section);
                if (match) {
                    section = [section.slice(0, match.index), "-", section.slice(match.index)].join('');
                    section += "--" + blob.Level;
                }
            }
            for (let x = 1; x <= choicenum; x++) {
                addRepeatingSection(rowid + " label", "choose", section + "_feature", function (id) {
                    var info = {};
                    info[id + "_info"] = title;
                    setAttrs(info);
                    setCharmancerOptions(id + "_choice", choice, settings, function () {
                        if (mancerdata[options.slide].values[id + "_choice"] && mancerdata[options.slide].values[id + "_choice"].split(":")[0] == "Blob") {
                            handleBlobs(blobs, {
                                filters: { name: mancerdata[options.slide].values[id + "_choice"].split(":")[1] },
                                section: section,
                                element: id + " span",
                                slide: options.slide,
                                parent: options.parent
                            });
                        }
                    });
                });
            }
            handleProficiencies(blob, rowid);
        });
    });
    _.each(sorted.spells, function (blob, name) {
        addRepeatingSection(element, "row", function (rowid) {
            let title = blob.Title ? blob.Title : name;
            let spells = JSON.parse(blob["Pick Spells"]);
            let settings = {};
            let repupdate = {};
            repupdate[rowid + ">label>span"] = title;

            //This used to check for blob.Description which does not exist for Spell Pickers
            //In such case the description is located at blob.Traits.Desc
            //By Miguel
            let description = getBlobDescription(blob);
            if (description.length > 0) {
                repupdate[rowid + ">label>p"] = description;
            }

            _.each(spells, function (spell) {
                addRepeatingSection(rowid, "utilityrow", function (rowid) {
                    let repupdate = {};
                    let set = {};
                    repupdate[`${rowid} button`] = spell.ButtonText;
                    set[`${rowid}_info`] = JSON.stringify(spell);
                    set[`${rowid}_type`] = "pick";
                    set[`${rowid}_parent`] = options.parent;
                    set[`${rowid}_blob`] = name;
                    setCharmancerText(repupdate);
                    setAttrs(set);
                });
            })
            setCharmancerText(repupdate);
            handleProficiencies(blob, rowid);
        });
    });
    _.each(sorted.other, function (blob, name) {
        if (blob.Title || blob.Description) {
            addRepeatingSection(element, "row", function (rowid) {
                var title = blob.Title ? blob.Title : name;
                var repupdate = {};
                repupdate[rowid + " label span"] = "" + title;
                repupdate[`${rowid} label p`] = blob.Prerequisite ? "<p class=\"prereq\">" + blob.Prerequisite + "</p>" : "";
                if (blob.Description) repupdate[rowid + " label p"] += blob.Description;
                setCharmancerText(repupdate);
                handleProficiencies(blob, rowid);
            });
        } else {
            handleProficiencies(blob);
        }
    });
    _.each(sorted.traits, function (blob, name) {
        var traitsObj = JSON.parse(blob.Traits);
        var title = blob.Title ? blob.Title : name;
        if (blob.Description || traitsObj.length > 1) {
            addRepeatingSection(element, "row", function (rowid) {
                if (blob.Description || blob.Title) {
                    var repupdate = {};
                    repupdate[rowid + " label span"] = "" + title;
                    if (blob.Description) repupdate[rowid + " label p"] = "" + blob.Description;
                    setCharmancerText(repupdate);
                }
                handleTraits(blob, rowid, name);
                handleProficiencies(blob, rowid);
            });
        } else {
            handleTraits(blob, undefined, name);
        }
    });
};

var addCustomSections = function (section) {
    var lower = section.toLowerCase();
    var page = "l1-" + lower.replace("sub", "");
    var mancerdata = getCharmancerData()[page];
    var repids = [];
    var total = 0;
    var current = 0;
    var traits = [];
    var profs = [];
    console.log(mancerdata);
    _.each(mancerdata.repeating, function (repid) {
        if (_.last(repid.split("_")) == "trait") {
            if (mancerdata.values[repid + "_name"] || mancerdata.values[repid + "_desc"]) {
                var thistrait = {};
                thistrait.name = mancerdata.values[repid + "_name"] ? mancerdata.values[repid + "_name"] : "";
                thistrait.desc = mancerdata.values[repid + "_desc"] ? mancerdata.values[repid + "_desc"] : "";
                traits.push(thistrait);
                total++;
            }
        }
        if (_.last(repid.split("_")) == "proficiency") {
            if (mancerdata.values[repid + "_type"]) {
                var thisprof = {};
                thisprof.type = mancerdata.values[repid + "_type"];
                thisprof.choice = mancerdata.values[repid + "_choice"] ? mancerdata.values[repid + "_choice"] : "";
                profs.push(thisprof);
                total++;
            }
        }
    });
    if (traits.length == 0) {
        traits.push({ name: "", desc: "" });
        total++;
    }
    if (profs.length == 0) {
        profs.push({ type: "", choice: "" });
        total++;
    }
    addRepeatingSection(lower + "_holder", "row", "customrow", function (rowid) {
        var toset = {};
        toset[rowid + " label span"] = "Proficiencies";
        repids.push(rowid);
        setCharmancerText(toset);
        _.each(profs, function (prof) {
            addRepeatingSection(rowid, "custom-proficiency", "custom_" + lower + "_proficiency", function (id) {
                var toset = {};
                if (prof.type != "") toset[id + "_type"] = prof.type;
                if (prof.choice != "") toset[id + "_choice"] = prof.choice;
                setAttrs(toset);
                current++;
                repids.push(id);
                if (current >= total) clearRepeating(repids, page, "customrow");
            });
        });
    });
    addRepeatingSection(lower + "_holder", "row", "customrow", function (rowid) {
        var toset = {};
        toset[rowid + " label span"] = "Custom " + section + " Features";
        repids.push(rowid);
        setCharmancerText(toset);
        _.each(traits, function (trait) {
            addRepeatingSection(rowid, "custom-trait", "custom_" + lower + "_trait", function (id) {
                var toset = {};
                if (trait.name != "") toset[id + "_name"] = trait.name;
                if (trait.desc != "") toset[id + "_desc"] = trait.desc;
                //update[id + " span"] = trait.name;
                setAttrs(toset);
                current++;
                repids.push(id);
                if (current >= total) clearRepeating(repids, page, "customrow");
            });
        });
    });
}

var clearRepeating = function (repids, page, match) {
    //This function removes all repeating sections that aren't in the repids array (except for the topbar).
    //The optional third argument will only remove certain types of repeating sections
    var mancerdata = getCharmancerData();
    _.each(mancerdata[page].repeating, function (repid) {
        if (_.last(repid.split("_")) != "topbar" && !repids.includes(repid) && (!match || match && repid.includes(match))) clearRepeatingSectionById(repid);
    });
}

//This function should be used to read additional hit points gained at first level by things like Draconic Bloodline or Hill Dwarf. Can be possbily be used in the future for Tough feat(?)
//By Miguel
var getAdditionalHitPointsFromClassAndRaceAtFirstLevel = function (blobs) {
    let additionalHP = 0;
    blobs.all.map(blob => {
        if ("Hit Points Per Level" in blob) {
            additionalHP += parseInt(blob["Hit Points Per Level"]);
        }
    });
    return additionalHP;
};

var getRelevantBlobs = function (mancerdata, level, section) {
    var results = [];
    var sorted = {};
    var names = {};
    level = level ? "" + level : "1";
    _.each(mancerdata, function (slide, slidename) {
        if (slidename.split("-")[0] == section) {
            _.each(slide.data, function (data, section) {
                if (data.blobs) {
                    var levelblobs = _.extend(filterBlobs(data.blobs, { "Level": level }), filterBlobs(data.blobs, { "Level": "every" }));
                    sorted[section] = [];
                    names[section] = [];
                    _.each(levelblobs, function (blob, blobname) {
                        results.push(blob);
                        sorted[section].push(blob);
                        names[section].push(blobname);
                    });
                };
            });
            _.each(slide.values, function (value, name) {
                if ((value + "").split(":")[0] == "Blob") {
                    var section = name.split("_")[2];
                    var blobs = slide.data[section] && slide.data[section].blobs ? slide.data[section].blobs : [];
                    _.each(filterBlobs(blobs, { "name": value.split(":")[1] }), function (blob, blobname) {
                        results.push(blob);
                        sorted[section] = sorted[section] ? sorted[section] : [];
                        sorted[section].push(blob);
                        names[section] = names[section] ? names[section] : [];
                        names[section].push(blobname);
                    });
                };
            });
        }
    });
    return { all: results, sorted: sorted, names: names };
};

var costOfScore = function (score) {
    if (isNaN(score) || score == 8) {
        return 0;
    }
    var cost = 0;
    if (score > 8) {
        if (score < 14) {
            cost = score - 8;
        } else if (score == 14) {
            cost = 7;
        } else if (score == 15) {
            cost = 9;
        } else {  // Score should never be higher, but let's cover our bases.
            cost = 11;
        }
    }
    return cost;
};

var recalcPoints = function () {
    data = getCharmancerData();
    var attribs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
    var maxPoints = 27;

    var scores = {};

    _.each(attribs, function (attrib) {
        scores[attrib] = parseInt(data["l1-abilities"].values[attrib]);
        if (isNaN(scores[attrib])) {
            scores[attrib] = 8;
        }
    });

    var pointsAvailable = maxPoints;

    // Decrement points based on selected attribs
    _.each(scores, function (score) {
        if (!isNaN(score)) {
            var cost = costOfScore(score);
            pointsAvailable -= cost;
        }
    });

    // Disable options if points are below a threshold.
    if (pointsAvailable < 9) {
        var choicesToDisable = ["15", "14", "13", "12", "11", "10", "9"];

        _.each(attribs, function (attrib) {
            var toDisableForThisAttrib = []
            _.each(choicesToDisable, function (choice) {
                if (scores[attrib] <= Number(choice) && (costOfScore(scores[attrib]) + pointsAvailable < costOfScore(Number(choice)))) {
                    toDisableForThisAttrib.push(choice);
                }
            });
            disableCharmancerOptions(attrib, toDisableForThisAttrib);
        });
    } else {
        _.each(attribs, function (attrib) {
            disableCharmancerOptions(attrib, []);
        });
    }

    _.each(attribs, function (attrib) {
        setCharmancerText({ "points_available_display": String(pointsAvailable) });
    });

    return String(pointsAvailable);
};

var setRollButton = function (name, data, title, hold) {
    getAttrs(["licensedsheet"], function (v) {
        var set = {};
        var holdstring = hold ? "r" + hold : "";
        title = title || name.split("_")[1];
        title = title[0].toUpperCase() + title.substring(1);
        const licensedsheet = (v.licensedsheet && v.licensedsheet === "1") ? "licensedsheet" : "";
        if (title == "Personality") title += " Trait";
        var roll = `@{wtype}&{template:mancerroll} {{title=${title}}} {{c1=[[1d${data.length + holdstring}]]}} {{licensedsheet=${licensedsheet}}}`;
        _.each(data, function (trait, x) {
            roll += ' {{option' + (x + 1) + '=' + trait + '}}';
        });
        set["roll_" + name + "_roll"] = roll;
        if (!hold) {
            set[name + "_array"] = JSON.stringify({ name: title, array: data });
        }
        setAttrs(set);
    });
};

/* MAIN CHOICE HANDLING */
on("mancerchange:race", function (eventinfo) {
    var mancerdata = getCharmancerData();
    getProficiencies(mancerdata, eventinfo.currentStep);
    changeCompendiumPage("sheet-race-info", eventinfo.newValue);
    hideChoices();

    var reset = {};
    if (!(eventinfo.newValue === "" || eventinfo.newValue === undefined)) {
        showChoices(["race_options"]);
    }
    recalcData();

    if (eventinfo.sourceType == "player") {
        reset = { race_ability_choice1: "", race_ability_choice2: "", subrace_ability_choice1: "", subrace_ability_choice2: "", subrace: "", race_name: "", subrace_name: "" };
        _.each(abilityList, function (ability) {
            reset["race_custom_" + ability.toLowerCase()] = 0;
            reset["subrace_custom_" + ability.toLowerCase()] = 0;
            reset[ability.toLowerCase() + "_save"] = "";
        });
        reset["custom_race_spell_ability"] = "";
        reset["custom_race_spell_number"] = "1";
        reset["custom_race_spell_list"] = "";
        reset["race_name"] = "";
        reset["subrace_name"] = "";
        reset["has_subrace"] = "";
        clearRepeatingSections("race_holder");
        clearRepeatingSections("subrace_holder");
    }

    if (eventinfo.newValue === "Rules:Races") {
        //Clears saved data for this field
        getCompendiumPage("");
        setAttrs(reset, function () {
            var update = { "race_text": "" };
            var options = eventinfo.sourceType == "player" ? { selected: "" } : {};
            showChoices(["custom_race"]);
            setCharmancerText(update);
            addCustomSections("Race");
            deleteCharmancerData(["l1-feat"]);
        });
    } else {
        getCompendiumPage(eventinfo.newValue, function (p) {
            p = removeDuplicatedPageData(p);
            setAttrs(reset, function () {
                mancerdata = getCharmancerData();
                var update = {};
                var showList = ["race_always", "race_traits"];
                var possibles = ["race_size", "race_speed", "race_ability_score", "race_traits"];
                var data = p["data"];

                _.each(proficiencyList, function (type) {
                    possibles.push("race_" + type.toLowerCase() + "s");
                });
                _.each(possibles, function (key) {
                    update[key] = "";
                });

                if (data["Size"]) { update["race_size"] = data["Size"]; };
                if (data["Speed"]) { update["race_speed"] = data["Speed"]; };

                showList = showList.concat(handleAbilities(data, "race"));
                if (data["data-Ability Score Increase"]) {
                    var abilityText = [];
                    var json = JSON.parse(data["data-Ability Score Increase"]);
                    _.each(json, function (increase, ability) {
                        abilityText.push(ability + " +" + increase);
                    });
                    update["race_ability_score"] = abilityText.join(", ");
                }
                handleBlobs(data.blobs, { filters: { "Level": "1" }, section: "race", slide: "l1-race" });

                setCharmancerText(update);

                var race_name = eventinfo.newValue && eventinfo.newValue.split(":").length > 1 && eventinfo.newValue.split(":")[0] === "Races" ? eventinfo.newValue.split(":")[1] : false;
                race_name = removeExpansionInfo(race_name);
                if (race_name) {
                    var subOptions = { show_source: true };
                    if (eventinfo.sourceType != "player") {
                        subOptions.silent = true;
                    } else {
                        subOptions.selected = "";
                    }

                    setCharmancerOptions("subrace", "Category:Subraces data-Parent:" + race_name, subOptions, function (values) {
                        if (values.length) {
                            setAttrs({ "has_subrace": "true" });
                            showChoices(["subrace"]);
                        }
                    });
                }
                else {
                    hideChoices(["subrace"]);
                }

                showChoices(showList);
                recalcData();
            });
        });
    }
});

on("mancerchange:subrace", function (eventinfo) {
    var mancerdata = getCharmancerData();
    getProficiencies(mancerdata, eventinfo.currentStep);
    changeCompendiumPage("sheet-race-info", eventinfo.newValue);

    var initHide = ["subrace_possible", "custom_trait_2", "custom_trait_3", "custom_trait_4"];
    var reset = {};
    if (eventinfo.newValue === "" || eventinfo.newValue === undefined) {
        initHide.push("subrace_options");
    }
    else {
        showChoices(["subrace_options"]);
    }
    hideChoices(initHide);
    recalcData();
    if (eventinfo.sourceType == "player") {
        reset = { subrace_ability_choice1: "", subrace_ability_choice2: "", subrace_name: "" };
        _.each(abilityList, function (ability) {
            reset["race_custom_" + ability.toLowerCase()] = 0;
            reset["subrace_custom_" + ability.toLowerCase()] = 0;
        });
        reset["custom_race_spell_ability"] = "";
        reset["custom_race_spell_number"] = "1";
        reset["custom_race_spell_list"] = "";
        reset["subrace_name"] = "";
        clearRepeatingSections("subrace_holder");
    }

    if (eventinfo.newValue === "Rules:Races") {
        //Clears saved data for this field
        getCompendiumPage("");
        setAttrs(reset, function () {
            var update = { "subrace_text": "" };
            var options = eventinfo.sourceType == "player" ? { selected: "" } : {};
            showChoices(["custom_subrace"]);
            setCharmancerText(update);
            addCustomSections("Subrace");
            deleteCharmancerData(["l1-feat"]);
        });
    } else {
        hideChoices(["custom_subrace"]);
        getCompendiumPage(eventinfo.newValue, function (p) {
            p = removeDuplicatedPageData(p);
            var update = {};
            var showList = ["subrace_choices"];
            var possibles = ["subrace_speed", "subrace_ability_score"];
            var data = p["data"];
            _.each(possibles, function (key) {
                update[key] = "";
            });

            if (!data["data-Feats"]) deleteCharmancerData(["l1-feat"], function () { recalcData(); });

            if (data["Speed"]) {
                update["subrace_speed"] = data["Speed"];
                showList.push("subrace_speed_row");
            };

            showList = showList.concat(handleAbilities(data, "subrace"));
            if (data["data-Ability Score Increase"]) {
                var abilityText = [];
                var json = JSON.parse(data["data-Ability Score Increase"]);
                _.each(json, function (increase, ability) {
                    abilityText.push(ability + " +" + increase);
                });
                update["subrace_ability_score"] = abilityText.join(", ");
            }
            handleBlobs(data.blobs, { filters: { "Level": "1" }, section: "subrace", slide: "l1-race" });

            setCharmancerText(update);
            showChoices(showList);
            setAttrs(reset);
            recalcData();
        });
    }
});

on("mancerchange:class", function (eventinfo) {
    var mancerdata = getCharmancerData();
    getProficiencies(mancerdata, eventinfo.currentStep);
    changeCompendiumPage("sheet-class-info", eventinfo.newValue);
    hideChoices();

    var initHide = ["class_possible", "subclass_choices"];
    var reset = {};
    if (!(eventinfo.newValue === "" || eventinfo.newValue === undefined)) {
        showChoices(["classes_options"]);
    }
    var current = recalcData();

    if (eventinfo.sourceType == "player") {
        reset = { subclass: "" };
        _.each(abilityList, function (ability) {
            reset[ability.toLowerCase() + "_save"] = "";
        });
        reset["custom_class_spell_ability"] = "";
        reset["custom_class_cantrip_number"] = "0";
        reset["custom_class_spell_number"] = "0";
        reset["custom_class_spell_list"] = "";
        reset["custom_hit_die"] = "";
        reset["class_name"] = "";
        reset["subclass_name"] = "";
        reset["class_equipment_choice1"] = "";
        reset["class_equipment_choice2"] = "";
        reset["class_equipment_choice3"] = "";
        reset["class_equipment_choice4"] = "";
        clearRepeatingSections("class_holder");
        clearRepeatingSections("subclass_holder");
    }

    if (eventinfo.newValue === "Rules:Classes") {
        //Clears saved data for this field
        getCompendiumPage("");
        setAttrs(reset, function () {
            var update = { "class_text": "", "custom_feature_name": "Class Features" };
            var options = eventinfo.sourceType == "player" ? { selected: "" } : {}
            showChoices(["custom_class"]);
            update["custom_feature_name"] = "Custom Class Features";
            setCharmancerText(update);
            addCustomSections("Class");
        });
    } else {
        getCompendiumPage(eventinfo.newValue, function (p) {
            p = removeDuplicatedPageData(p);
            var update = {};
            var showList = [];
            var data = p["data"];
            var hideList = [];
            handleBlobs(data.blobs, { filters: { "Level": "1" }, section: "class", slide: "l1-class" });

            var class_name = eventinfo.newValue && eventinfo.newValue.split(":").length > 1 && eventinfo.newValue.split(":")[0] === "Classes" ? eventinfo.newValue.split(":")[1] : false;
            class_name = removeExpansionInfo(class_name);
            if (class_name && data["data-Subclass Level"] == 1) {
                var subOptions = { show_source: true };
                if (eventinfo.sourceType != "player") {
                    subOptions.silent = true;
                } else {
                    subOptions.selected = "";
                }
                update["subclass_prompt"] = "Choose a " + data["Subclass Name"];
                setCharmancerOptions("subclass", "Category:Subclasses data-Parent:" + class_name, subOptions, function (values) {
                    if (values.length) showChoices(["subclass"]);
                });
            }
            else {
                hideList.push("subclass");
            }

            if (data["data-Equipment"]) {
                showList.push("class_equipment_row");
                var equipment_string = "";
                var json = JSON.parse(data["data-Equipment"]);
                if (json["default"]) {
                    equipment_string += json["default"].join(", ");
                }
                for (var i = 1; i < 5; i++) {
                    if (json[i]) {
                        if (!json["default"].length && i == 1) {
                            equipment_string += "";
                        } else {
                            equipment_string += " and ";
                        }

                        equipment_string += cleanEquipment(json[i]);
                    }
                };
                update["class_standard_equipment"] = equipment_string;
            }

            setCharmancerText(update);
            showChoices(showList);
            hideChoices(hideList);
            recalcData();
            setAttrs(reset);
        });
    }
});

on("mancerchange:subclass", function (eventinfo) {
    var mancerdata = getCharmancerData();
    getProficiencies(mancerdata, eventinfo.currentStep);
    changeCompendiumPage("sheet-class-info", eventinfo.newValue);

    var initHide = ["subclass_possible"];
    var reset = {};
    if (eventinfo.newValue === "" || eventinfo.newValue === undefined) {
        initHide.push("subclass_options");
        initHide.push("custom_subclass");
    }
    else {
        showChoices(["subclass_options"]);
        if (eventinfo.newValue === "Rules:Classes") {
            showChoices(["custom_subclass"]);
        }
        else {
            initHide.push("custom_subclass");
        }
    }
    hideChoices(initHide);
    var current = recalcData();

    if (eventinfo.sourceType == "player") {
        reset["custom_class_spell_ability"] = "";
        reset["custom_class_cantrip_number"] = "0";
        reset["custom_class_spell_number"] = "0";
        reset["custom_class_spell_list"] = "";
        reset["custom_subclass_cantrip_number"] = "0";
        reset["custom_subclass_cantrip_list"] = "";
        reset["custom_subclass_spell_number"] = "0";
        reset["custom_subclass_spell_list"] = "";
        reset["subclass_name"] = "";
        clearRepeatingSections("subclass_holder");
    }

    if (eventinfo.newValue === "Rules:Classes") {
        //Clears saved data for this field
        getCompendiumPage("");
        setAttrs(reset, function () {
            var mancerdata = getCharmancerData();
            var options = eventinfo.sourceType == "player" ? { selected: "" } : {};
            var subclassname = mancerdata["l1-class"].data.class["Subclass Name"];
            showChoices(["custom_subclass"]);
            if (mancerdata["l1-class"].data.class && mancerdata["l1-class"].data.class["Spellcasting Ability"]) {
                showChoices(["custom_additional_spells"]);
            } else {
                showChoices(["custom_class_spells"]);
            }
            addCustomSections("Subclass");
        });
    } else {
        hideChoices(["custom_subclass"]);
        getCompendiumPage(eventinfo.newValue, function (p) {
            p = removeDuplicatedPageData(p);
            var data = p["data"];
            handleBlobs(data.blobs, { filters: { "Level": "1" }, section: "subclass", slide: "l1-class" });

            recalcData();
            setAttrs(reset);
        });
    }
});

on("mancerchange:background", function (eventinfo) {
    var mancerdata = getCharmancerData();
    getProficiencies(mancerdata, eventinfo.currentStep);
    changeCompendiumPage("sheet-background-info", eventinfo.newValue);

    var initHide = ["background_possible", "custom_background"];
    var reset = {};
    if (eventinfo.newValue === "" || eventinfo.newValue === undefined) {
        initHide.push("backgrounds_options");
    }
    else {
        showChoices(["backgrounds_options"]);
    }
    hideChoices(initHide);
    var current = recalcData();

    if (eventinfo.sourceType == "player") {
        reset = {};
        reset["background_detail_choice"] = "";
        reset["background_personality_choice1"] = "";
        reset["background_personality_choice2"] = "";
        reset["background_ideal_choice"] = "";
        reset["background_bond_choice"] = "";
        reset["background_flaw_choice"] = "";
        reset["custom_background_trait_name"] = "";
        reset["custom_background_trait_desc"] = "";
        clearRepeatingSections("background_holder");
    }

    if (eventinfo.newValue === "Rules:Backgrounds") {
        //Clears saved data for this field
        getCompendiumPage("");
        setAttrs(reset, function () {
            var update = { "background_text": "" };
            var options = eventinfo.sourceType == "player" ? { selected: "" } : {}
            hideChoices(["standardbg"]);
            showChoices(["custom_background"]);
            setCharmancerText(update);
            addCustomSections("Background");
        });
    } else {
        getCompendiumPage(eventinfo.newValue, function (p) {
            p = removeDuplicatedPageData(p);
            var update = {};
            var showList = ["standardbg"];
            var possibles = ["background_feature"];
            var data = p["data"];
            var hideList = [];

            _.each(proficiencyList, function (type) {
                possibles.push("background_" + type.toLowerCase() + "s");
            });
            _.each(possibles, function (key) {
                update[key] = "";
            });
            handleBlobs(data.blobs, { filters: { "Level": "1" }, section: "background", slide: "l1-background" });

            if (data["data-Background Choices"] && data["data-Background Choices"] != "") {
                showList.push("background_detail_choice_row");
                var choices = JSON.parse(data["data-Background Choices"]);
                showList.push("background_detail_choice");
                setCharmancerOptions("background_detail_choice", choices, {}, function (opts) {
                    setRollButton("background_detail_choice", opts, data["data-Background Choice Name"]);
                });
                update["background_detail_choice_name"] = data["data-Background Choice Name"];
            }
            if (eventinfo.sourceType == "player") {
                reset["background_detail_choice"] = "";
            }

            if (data["data-Personality Traits"]) {
                showList.push("background_personality_row");
                var choices = JSON.parse(data["data-Personality Traits"]);
                setCharmancerOptions("background_personality_choice1", choices, {}, function (opts) {
                    setRollButton("background_personality_choice1", opts);
                });
                setCharmancerOptions("background_personality_choice2", choices, {}, function (opts) {
                    setRollButton("background_personality_choice2", opts);
                });
                showList.push("background_personality_choice1");
                showList.push("background_personality_choice2");
            }
            if (data["data-Ideals"]) {
                var choices = JSON.parse(data["data-Ideals"]);
                setCharmancerOptions("background_ideal_choice", choices, {}, function (opts) {
                    setRollButton("background_ideal_choice", opts);
                });
                showList.push("background_ideal_choice");
            }
            if (data["data-Bonds"]) {
                var choices = JSON.parse(data["data-Bonds"]);
                setCharmancerOptions("background_bond_choice", choices, {}, function (opts) {
                    setRollButton("background_bond_choice", opts);
                });
                showList.push("background_bond_choice");
            }
            if (data["data-Flaws"]) {
                var choices = JSON.parse(data["data-Flaws"]);
                setCharmancerOptions("background_flaw_choice", choices, {}, function (data) {
                    setRollButton("background_flaw_choice", data);
                });
                showList.push("background_flaw_choice");
            }

            if (eventinfo.sourceType == "player") {
                reset = _.extend(reset, { "background_personality_choice1": "", "background_personality_choice2": "", "background_ideal_choice": "", "background_bond_choice": "", "background_flaw_choice": "" });
            }

            if (data["data-Equipment"]) {
                showList.push("background_equipment_row");
                var equipment_string = "";
                var json = JSON.parse(data["data-Equipment"]);
                if (json["default"]) {
                    equipment_string += json["default"].join(", ");
                }
                for (var i = 1; i < 5; i++) {
                    if (json[i]) {
                        if (!json["default"].length && i == 1) {
                            equipment_string += "";
                        } else {
                            equipment_string += " and ";
                        }

                        equipment_string += cleanEquipment(json[i]);
                    }
                };
                update["background_standard_equipment"] = equipment_string;
            }

            var background_name = eventinfo.newValue && eventinfo.newValue.split(":").length > 1 && eventinfo.newValue.split(":")[0] === "Backgrounds" ? eventinfo.newValue.split(":")[1] : false;

            setCharmancerText(update);
            showChoices(showList);
            hideChoices(hideList);
            recalcData();
            setAttrs(reset);
        });
    }
});

/* ABILITY SCORE */
on("page:l1-abilities", function (eventinfo) {
    var data = getCharmancerData();
    getCompendiumPage("Rules:Ability%20Scores", function (p) {
        p = removeDuplicatedPageData(p);
        var pagedata = p["data"];
        var allChoices = [];
        if (pagedata["data-Generation Choices"]) {
            var genChoices = JSON.parse(pagedata["data-Generation Choices"]);
            _.each(genChoices, function (value, choice) {
                allChoices.push(choice);
            });
        }
        setCharmancerOptions("abilities", allChoices);


        if (data["l1-abilities"] && data["l1-abilities"].values && data["l1-abilities"].values.abilities) {
            setAttrs({ "abilities": data["l1-abilities"].values.abilities });
        }
    });
});

on("mancerchange:abilities", function (eventinfo) {
    var data = getCharmancerData();
    var initHide = ["abilities_possible"];
    var attribs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
    var standardArray = ["8", "10", "12", "13", "14", "15"];
    var pointbuyChoices = ["8", "9", "10", "11", "12", "13", "14", "15"];

    hideChoices(initHide);


    if (data["l1-abilities"].values.abilities == "Standard Array") {
        showChoices(["abilities_stdarray", "abilities_selects"]);
        _.each(attribs, function (attrib) {
            setCharmancerOptions(attrib, standardArray);
        });
    }

    if (data["l1-abilities"].values.abilities == "Roll for Stats") {
        showChoices(["abilities_rollstats"]);
        if (data["l1-abilities"].values.roll_results && data["l1-abilities"].values.roll_results.length) {
            showChoices(["abilities_rollstats_rolled", "abilities_selects"]);
            var roll_results = typeof data["l1-abilities"].values.roll_results == "string" ? data["l1-abilities"].values.roll_results.split(",") : data["l1-abilities"].values.roll_results;
            _.each(attribs, function (attrib) {
                setCharmancerOptions(attrib, roll_results);
            });
        }
    }

    if (data["l1-abilities"].values.abilities == "Point Buy") {
        showChoices(["abilities_pointbuy", "abilities_selects"]);
        setCharmancerText({ "points_available_display": data["l1-abilities"].values.pointbuy_points || "27" });
        _.each(attribs, function (attrib) {
            setCharmancerOptions(attrib, pointbuyChoices);
        });
    }

    if (data["l1-abilities"].values.abilities == "custom") {
        showChoices(["abilities_custom"]);
    }

    reset = {};
    if (eventinfo.sourceType == "player") {
        _.each(attribs, function (attrib) {
            reset[attrib] = "";
        });
        reset["pointbuy_points"] = "27"
    }


    recalcData();
    setAttrs(reset);
});

on("mancerchange:strength mancerchange:dexterity mancerchange:constitution mancerchange:intelligence mancerchange:wisdom mancerchange:charisma", function (eventinfo) {
    data = getCharmancerData();
    var attribs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
    var clearvalue = eventinfo.newValue;
    var clearObject = {
        strength: data["l1-abilities"].values.strength,
        dexterity: data["l1-abilities"].values.dexterity,
        constitution: data["l1-abilities"].values.constitution,
        intelligence: data["l1-abilities"].values.intelligence,
        wisdom: data["l1-abilities"].values.wisdom,
        charisma: data["l1-abilities"].values.charisma
    };

    if (data["l1-abilities"].values.abilities != "custom" && data["l1-abilities"].values.abilities != "Point Buy") {
        attribs = _.reject(attribs, function (item) { return item == eventinfo.triggerName; });
        _.each(attribs, function (attrib) {
            if (clearvalue == clearObject[attrib]) {
                clearObject[attrib] = "";
            }
        });
    }

    if (data["l1-abilities"].values.abilities == "Point Buy") {
        clearObject.pointbuy_points = recalcPoints();
    }

    if (eventinfo.sourceType == "player") {
        setAttrs(clearObject);
    }
    recalcData();
});

on("mancerroll:rollstats", function (eventinfo) {
    var attribs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
    var results = [];
    var i = 1;
    _.each(eventinfo.roll, function (roll) {
        results.push(roll.result + "~" + i);
        i++;
    });
    results.sort(function (a, b) { return Number(a.split("~")[0]) - Number(b.split("~")[0]) });
    _.each(attribs, function (attrib) {
        setCharmancerOptions(attrib, results);
    });
    setAttrs({ roll_results: results, strength: "", dexterity: "", constitution: "", intelligence: "", wisdom: "", charisma: "" });
    showChoices(["abilities_rollstats_rolled", "abilities_selects"]);
});

on("clicked:clearstats", function (eventinfo) {
    var data = getCharmancerData();
    var attribs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
    reset = {};
    _.each(attribs, function (attrib) {
        reset[attrib] = "";
        disableCharmancerOptions(attrib, []);
    });

    setAttrs(reset);
});

/* EQUIPMENT */
on("page:l1-equipment", function (eventinfo) {
    getAttrs(["licensedsheet"], function (v) {
        var data = getCharmancerData();
        var class_string = getName("class", data, true);
        var background_string = getName("background", data, true);
        var class_equipment = data && data["l1-equipment"] && data["l1-equipment"].values.equipment_class ? data["l1-equipment"].values.equipment_class : undefined;
        var background_equipment = data && data["l1-equipment"] && data["l1-equipment"].values.equipment_background ? data["l1-class"].values.equipment_background : undefined;
        var update = {};
        var update_attr = {};
        var showList = [];
        var hideList = [];
        var allBlobs = getRelevantBlobs(data, "1", "l1");
        var equipmentType = data["l1-equipment"] && data["l1-equipment"].values.equipment_type ? data["l1-equipment"].values.equipment_type : "";
        const licensedsheet = (v.licensedsheet && v.licensedsheet === "1") ? "licensedsheet" : "";
        var handleChoices = function (type) {
            var equipment = {};
            if (data["l1-" + type] && data["l1-" + type].data[type] && data["l1-" + type].data[type]["data-Equipment"]) {
                equipment = data["l1-" + type].data[type]["data-Equipment"];
            };
            if (allBlobs.sorted[type]) {
                _.each(allBlobs.sorted[type], function (blob) {
                    if (blob.Equipment) {
                        var blobstuff = blob.Equipment;
                        try {
                            blobstuff = JSON.parse(blob.Equipment);
                        } catch (e) { }
                        equipment.default = equipment.default ? equipment.default.concat(blobstuff) : blobstuff;
                    }
                });
            };
            _.each(equipment, function (feature, num) {
                if (num === "default") {
                    update[type + "_equipment"] = feature.join(", ");
                } else {

                    var dynamic_items = "Category:None";
                    var static_items = [];
                    var hasDouble = false;
                    var doubleOffset = 4;
                    var equipmentTitle = cleanEquipment(feature).replace(/^\w/, function (char) { return char.toUpperCase(); }).replace(/(^\(|\)$)/g, "");
                    if (equipmentTitle.search("Two of") == 0) {
                        equipmentTitle += ")";
                    }
                    update[type + "_equipment_choice" + num + "_title"] = equipmentTitle;
                    _.each(feature, function (f) {
                        if (f.indexOf("Subtype:") > -1) {
                            dynamic_items = 'Category:Items "Item Rarity":Standard ' + f.split("~")[0];
                        } else if (f.indexOf("*Weapon") > -1) {
                            dynamic_items = 'Category:Items "Item Rarity":Standard ' + f.split("~")[0];
                        } else {
                            static_items.push(f);
                        }
                        if (f.split("~")[1] && f.split("~")[1] == "DBL") {
                            hasDouble = true;
                        }
                    });
                    if (hasDouble) {
                        showList.push(type + "_equipment_choice" + num + "_double");
                        var doubleChoiceNum = parseInt(num) + doubleOffset;
                        setCharmancerOptions(type + "_equipment_choice" + doubleChoiceNum, dynamic_items, { add: static_items, category: "Items" });
                    } else {
                        hideList.push(type + "_equipment_choice" + num + "_double");
                    }
                    setCharmancerOptions(type + "_equipment_choice" + num, dynamic_items, { add: static_items, category: "Items" });
                    showList.push(type + "_equipment_choice" + num);
                }
            });
        };
        recalcData();

        if (class_string) {
            showList.push("has_class");
            update["class_label"] = class_string;
            update_attr["equipment_class"] = class_string;
            if (class_equipment && class_equipment != class_string) {
                update["starting_gold_btn_label"] = "";
                update["class_equipment"] = "";
                update_attr["starting_gold"] = 0;
                update_attr["equipment_type"] = "";
                equipmentType = "";
                update_attr["class_equipment_choice1"] = "";
                update_attr["class_equipment_choice2"] = "";
                update_attr["class_equipment_choice3"] = "";
                update_attr["class_equipment_choice4"] = "";
                update_attr["class_equipment_choice5"] = "";
                update_attr["class_equipment_choice6"] = "";
                update_attr["class_equipment_choice7"] = "";
                update_attr["class_equipment_choice8"] = "";
            };

            if (class_string == "custom") {
                update_attr["equipment_type"] = "gold";
                hideList.push("equipment_type", "random_gold_option")
                showList.push("custom_class_gold", "gold_option", "eqp_custom_class");
            } else {
                handleChoices("class");
                var startingGold = data["l1-class"].data.class && data["l1-class"].data.class["Starting Gold"] ? data["l1-class"].data.class["Starting Gold"] : false;
                if (startingGold) {
                    update["starting_gold_btn_label"] = startingGold;
                    update_attr["roll_starting_gold"] = `@{wtype}&{template:mancerroll} {{title=Starting Gold}} {{r1=[[${startingGold.replace("x", "*")}]]}} {{licensedsheet=${licensedsheet}}}`;
                    showList.push("random_gold_option");
                } else {
                    update_attr["roll_starting_gold"] = `@{wtype}&{template:mancerroll} {{title=Starting Gold}} {{r1=[[0]]}} {{licensedsheet=${licensedsheet}}}`;
                    update_attr["equipment_type"] = "class";
                    equipmentType = "class";
                    hideList.push("equipment_type", "gold_option");
                    showList.push("class_option", "no_gold_option");
                }
            }
        } else {
            showList.push("no_class");
        };

        if (background_string) {
            update["background_label"] = background_string;
            update_attr["equipment_background"] = background_string;
            if (background_string != "custom") {
                handleChoices("background");
            }
            if (data["l1-equipment"] && data["l1-equipment"].values.equipment_type || class_string == "custom") {
                if (data["l1-equipment"] && equipmentType == "class" || class_string == "custom") {
                    showList.push("has_background");
                    if (background_equipment && background_equipment != background_string) {
                        update["background_equipment"] = "";
                        update_attr["background_equipment_choice1"] = "";
                        update_attr["background_equipment_choice2"] = "";
                        update_attr["background_equipment_choice3"] = "";
                        update_attr["background_equipment_choice4"] = "";
                    };
                }
                if (data["l1-equipment"] && equipmentType == "gold" && class_string != "custom") {
                    showList.push("background_chose_starting_gold");
                }
            }
        } else {
            showList.push("no_background");
        }

        if (equipmentType === "" || equipmentType === undefined) {
            hideList.push("gold_option", "class_option");
        } else if (equipmentType === "gold") {
            if (background_string) showList.push("background_gold_option");
            showList.push("gold_option");
            hideList.push("class_option");
        } else if (equipmentType === "class") {
            showList.push("class_option");
            hideList.push("gold_option");
        }

        showChoices(showList);
        hideChoices(hideList);
        setCharmancerText(update);
        setAttrs(update_attr);
    });
});

on("mancerchange:equipment_type", function (eventinfo) {
    var showList = [];
    var hideList = [];
    var update = {};
    var reset = {};
    var data = getCharmancerData();
    var class_string = getName("class", data, true);
    var background_string = getName("background", data, true);
    if (eventinfo.sourceType == "player") {
        if (eventinfo.newValue === "" || eventinfo.newValue === undefined) {
            hideList.push("gold_option", "class_option", "background_gold_option");
        } else if (eventinfo.newValue === "gold") {
            if (background_string) showList.push("background_gold_option");
            if (class_string != "custom") showList.push("random_gold_option")
            showList.push("gold_option");
            hideList.push("class_option");
        } else if (eventinfo.newValue === "class") {
            showList.push("class_option");
            hideList.push("gold_option", "background_gold_option");
        }
    }
    showChoices(showList);
    hideChoices(hideList);
});

on("mancerroll:starting_gold", function (eventinfo) {
    setAttrs({ starting_gold: eventinfo.roll[0].result });
});

/* REPEATING SECTION LISTENERS */
on("mancerchange:repeating_row", function (eventinfo) {
    var mancerdata = getCharmancerData();
    var proficiencies = getProficiencies(mancerdata, eventinfo.currentStep);
    var section = eventinfo.sourceSection.split("_")[2].split("-")[0].replace(/[0-9]+$/gm, "");
    var type = eventinfo.sourceSection.split("_")[3];
    var sourcepage = eventinfo.currentStep;
    if (eventinfo.currentStep.split("-")[0] == "lp") {
        var sectioninfo = eventinfo.sourceSection.split("_")[2].split("--")[0];
        if (sectioninfo.indexOf("-") === -1) {
            let index = sectioninfo.indexOf(section) + section.length;
            sectioninfo = [sectioninfo.slice(0, index), "-", sectioninfo.slice(index)].join('');
        }
        sectioninfo = sectioninfo.split("-");
        if (sectioninfo.length > 1) {
            sourcepage = "lp-levels";
            section = "class" + sectioninfo[1];
            if (sectioninfo[0] == "subclass") section += "_subclass";
        } else {
            sourcepage = "lp-welcome";
            section = "lp-" + sectioninfo[0];
        }
    }
    var pagedata = mancerdata[sourcepage].data[section];
    if (_.last(eventinfo.sourceAttribute.split("_")) == "choice") {
        if (type == "feature") {
            if (eventinfo.previousValue !== eventinfo.newValue) {
                clearRepeatingSections(eventinfo.sourceSection + " span");
                if (eventinfo.newValue.split(":")[0] == "Blob") {
                    console.log(pagedata.blobs[eventinfo.newValue.split(":")[1]]);
                    if (pagedata.blobs[eventinfo.newValue.split(":")[1]]["Pick Spells"] || pagedata.blobs[eventinfo.newValue.split(":")[1]].Spells) {
                        deleteCharmancerData(["lp-spells"]);
                    }
                    handleBlobs(pagedata.blobs, {
                        filters: { name: eventinfo.newValue.split(":")[1] },
                        section: section,
                        element: eventinfo.sourceSection + " span",
                        slide: eventinfo.currentStep,
                        parent: section
                    });
                }
            }
        }
        if (eventinfo.newValue == "custom") {

            showChoices(["custom[name=comp_" + eventinfo.sourceSection + "_custom]"]);
        } else {
            var toset = {};
            hideChoices(["custom[name=comp_" + eventinfo.sourceSection + "_custom]"]);
            toset[eventinfo.sourceSection + "_custom"] = "";
            setAttrs(toset);
        }
    }
});

on("mancerchange:repeating_row", function (eventinfo) {
    if (eventinfo.currentStep !== "lp-choices") return;
    if (eventinfo.sourceAttribute.indexOf("feature_choice") === -1 && eventinfo.sourceAttribute.indexOf("feature_info") === -1) return;

    const data = getCharmancerData();
    const traits = JSON.parse(data["lp-welcome"].values.previous_repeating).traits || [];
    const singleSelectionTraits = [
        { group: "Maneuvers", single: "Maneuver" }
    ]; //Types of traits that can be taken only once.
    let traitsAlreadyTaken = [];

    //Read the current type of a trait
    const currentTrait = data["lp-choices"].values[eventinfo.sourceAttribute.replace("_choice", "_info")] || "";
    const traitIndex = singleSelectionTraits.map(trait => { return trait.group; }).indexOf(currentTrait);

    //Return if the trait is not among the ones set for single selection.
    if (traitIndex === -1) return;

    //Get single item type
    const traitType = singleSelectionTraits[traitIndex].single + ": ";

    const getRelevantChoices = function (data, choiceType) {
        const choices = data["lp-choices"].values || [];
        let relevantChoices = [];
        for (choice in choices) {
            if (choice.indexOf("_info") === -1) continue;
            if (choices[choice] === choiceType) relevantChoices.push(choice.replace("_info", ""));
        }
        return relevantChoices;
    };

    //Reading traits set in previous Levels
    for (trait in traits) {
        if (traits[trait].name.indexOf(traitType) > -1) {
            const selectedTrait = traits[trait].name.replace(traitType, "");
            traitsAlreadyTaken.push("Blob:" + selectedTrait);
        }
    }

    //Handling traits choosen at current LP
    const choices = getRelevantChoices(data, singleSelectionTraits[traitIndex].group);
    for (choice in choices) {
        if (choices[choice] + "_choice" in data["lp-choices"].values) {
            traitsAlreadyTaken.push(data["lp-choices"].values[choices[choice] + "_choice"]);
        }
    }

    //Disable elements
    for (choice in choices) {
        //Enables all options
        disableCharmancerOptions(choices[choice] + "_choice", "");
        //Disable maneuvers arealdy selected at lv1 or during current LP
        disableCharmancerOptions(choices[choice] + "_choice", traitsAlreadyTaken);
    }
});

on("mancerchange:repeating_spellrow", function (eventinfo) {
    if (eventinfo.sourceType == "player") {
        changeCompendiumPage("sheet-spells-info", eventinfo.newValue, "card_only");
    }
    var mancerdata = getCharmancerData();
    var known = knownSpells().known;
    _.each(mancerdata["l1-spells"].repeating, function (id) {
        disableCharmancerOptions(id + "_choice", known, { category: "Spells" });
    });
});

//D&D 5e: Charactermancer Lvl+ Druid, Circle of Land feedback improvement (UC811)
//Land druids used to be able to change multiple lands once they levelup. This goes against the rules. This is a fix for that issue.
//By Miguel
on("mancerchange:repeating_row", function (eventinfo) {
    const featureName = "Circle Spells";
    const feedback = "You must choose your Circle Land at 3rd level";

    const data = getCharmancerData();
    //First we detect if this is circle spell, otherwise return.
    if (eventinfo.currentStep !== "lp-choices") return;
    if (eventinfo.sourceAttribute.indexOf("feature_choice") === -1 && eventinfo.sourceAttribute.indexOf("feature_info") === -1) return;
    if (!eventinfo.sourceSection + "_info" in data["lp-choices"].values || !data["lp-choices"].values[eventinfo.sourceSection + "_info"] === featureName) return;

    const previousRepeating = JSON.parse(data["lp-welcome"].values.previous_repeating);
    const previousTraits = previousRepeating.traits;
    const initialCircleTrait = previousTraits.findIndex(item => item.name.indexOf(featureName + ": ") > -1);

    //A land was had not been selected yet when Mancer was started (Ex: Levelling from LV 1st to 5th)
    if (!(/repeating_-.+_subclass-.+--[^3]+_feature/g).test(eventinfo.sourceSection)) {
        const choices = data["lp-choices"].values;
        for (choice in choices) {
            if (choices[choice] === featureName) {
                //Set all non 3rd level pickers to the choose value
                if ((/repeating_-.+_subclass-.+--[^3]+_feature/g).test(choice) && choice.indexOf("_info") > -1 && choices[choice] === featureName) {
                    const pickerClass = choice.replace("_info", "_choice");
                    const currentValue = eventinfo.newValue.replace("Blob:", "");
                    const initialLand = currentValue.replace(featureName, "").trim();
                    const choiceLevel = choice.match(/--./)[0].replace("--", "");
                    const choiceValue = initialLand + " " + featureName + "(" + choiceLevel + ")";
                    if ((eventinfo.newValue === "" || eventinfo.newValue === featureName) && eventinfo.previousValue !== feedback) {
                        setCharmancerOptions(pickerClass, [feedback], { selected: feedback }, function () {
                            disableCharmancerOptions(pickerClass, [""]);
                        });
                    } else {
                        setCharmancerOptions(pickerClass, [choiceValue], { category: "Blob", selected: "Blob:" + choiceValue }, function () {
                            disableCharmancerOptions(pickerClass, [""]);
                        });
                    }
                }
            }
        }
        return;
    }
    //A land was already selected when Mancer was started (Ex: Levelling from LV 3rd to 5th)
    else if (initialCircleTrait > -1) {
        const initialLand = previousTraits[initialCircleTrait].name.replace(featureName + ": ", "");
        const choiceLevel = eventinfo.sourceSection.match(/--./)[0].replace("--", "");
        const choiceValue = initialLand + " " + featureName + "(" + choiceLevel + ")";
        const choiceClass = eventinfo.sourceSection + "_choice";
        setCharmancerOptions(choiceClass, [choiceValue], { category: "Blob", selected: "Blob:" + choiceValue }, function () {
            disableCharmancerOptions(choiceClass, [""]);
        });
    }
});

on("clicked:repeating_spellrow", function (eventinfo) {
    var spell_name = "";
    var data = getCharmancerData();
    var card = "card_only";
    if (_.last(eventinfo.sourceSection.split("_")) == "spellrow") {
        spell_name = data["l1-spells"].values[eventinfo.sourceAttribute];
    } else {
        spell_name = data["l1-spells"].values[eventinfo.sourceSection + "_choice"] ? data["l1-spells"].values[eventinfo.sourceSection + "_choice"] : "Rules:Spells";
        card = data["l1-spells"].values[eventinfo.sourceSection + "_choice"] ? card : "";
    }
    changeCompendiumPage("sheet-spells-info", spell_name, card);
});

on("mancerchange:repeating_customrow", function (eventinfo) {
    var mancerdata = getCharmancerData();
    var profdata = getProficiencies(mancerdata, eventinfo.currentStep);
    if (eventinfo.sourceAttribute.substr(-10) == "trait_name") {
        var update = {};
        update[eventinfo.sourceSection + " span"] = eventinfo.newValue;
        setCharmancerText(update);
    }
    if (_.last(eventinfo.sourceSection.split("_")) == "proficiency") {
        if (_.last(eventinfo.sourceAttribute.split("_")) == "type") {
            var update = {};
            var prof = eventinfo.newValue;
            var choices = prof == "" ? [] : "Category:Proficiencies \"Type:" + prof + "\"";
            var settings = { category: "Proficiencies", disable: profdata.all[prof] };
            update[eventinfo.sourceSection + " span + select"] = '<option value="" data-i18n="choose"></option>';
            if (prof == "Language") update[eventinfo.sourceSection + " span + select"] += '<option class="custom" value="custom" data-i18n="custom"></option>';
            update[eventinfo.sourceSection + " span"] = eventinfo.newValue;
            setCharmancerText(update);
            if (prof == "") {
                var toset = {};
                toset[eventinfo.sourceSection + "_choice"] = "";
                toset[eventinfo.sourceSection + "_custom"] = "";
                setAttrs(toset);
                hideChoices(["custom[name=comp_" + eventinfo.sourceSection + "_custom]"]);
            } else {
                setCharmancerOptions(eventinfo.sourceSection + "_choice", choices, settings);
            }
        } else if (_.last(eventinfo.sourceAttribute.split("_")) == "choice") {
            if (eventinfo.newValue == "custom") {
                showChoices(["custom[name=comp_" + eventinfo.sourceSection + "_custom]"]);
            } else {
                var toset = {};
                hideChoices(["custom[name=comp_" + eventinfo.sourceSection + "_custom]"]);
                toset[eventinfo.sourceSection + "_custom"] = "";
                setAttrs(toset);
            }
        }
    }
});

on("clicked:repeating_customrow", function (eventinfo) {
    var mancerdata = getCharmancerData();
    getRepeatingSections(function (repeating) {
        var target = "";
        var section = eventinfo.sourceSection.split("_")[3]
        var type = _.last(eventinfo.sourceSection.split("_"));
        _.each(repeating.tree, function (branch, parentid) {
            _.each(branch, function (child, childid) {
                if (childid == eventinfo.sourceSection) target = parentid;
            });
        });
        addRepeatingSection(target, "custom-" + type, "custom_" + section + "_" + type);
    });
});

on(customListeners, function (eventinfo) {
    var mancerdata = getCharmancerData();
    var num = parseInt(eventinfo.triggerName.substr(-1));
    var base = eventinfo.triggerName.slice(0, -1);
    var section = eventinfo.triggerName.split("_")[0].replace("sub", "");
    if (mancerdata["l1-" + section].values[base.split("_")[0]]
        && ["Rules", "CategoryIndex"].indexOf(mancerdata["l1-" + section].values[base.split("_")[0]].split(":")[0]) != -1
        && eventinfo.newValue) {
        showChoices([base + (num + 1)]);
    }
});

on(changeListeners, function (eventinfo) {
    recalcData();
});

on("mancerchange:custom_race_spell_ability mancerchange:custom_class_spell_ability", function (eventinfo) {
    var section = eventinfo.triggerName.split("_")[1];
    if (eventinfo.newValue) {
        showChoices(["custom_spellcasting"]);
    } else {
        var set = {}
        set["custom_" + section + "_spell_number"] = "1";
        set["custom_" + section + "_cantrip_number"] = "1";
        set["custom_" + section + "_spell_list"] = "";
        setAttrs(set);
        hideChoices(["custom_spellcasting"]);
    }
});

on("page:l1-welcome page:l1-class page:l1-race page:l1-abilities page:l1-background page:l1-equipment page:l1-spells page:l1-feat page:l1-bio page:l1-summary", function (eventinfo) {
    var mancerdata = getCharmancerData();
    var buttons = "";
    var buttoninfo = {
        welcome: "charmancer-start",
        race: "race-u",
        class: "class-u",
        abilities: "abilities-u",
        background: "background-u",
        equipment: "equipment-u",
        spells: "spells-u",
        feat: "feats-u",
        bio: "bio-u",
        summary: "review-u"
    }
    _.each(buttoninfo, function (translation, page) {
        var here = "l1-" + page == eventinfo.triggerName;
        buttons += "<li><button class=\"step" + (here ? " here" : "") + "\" type=\"" + (here ? "here" : "back") + "\" value=\"l1-" + page + "\" data-i18n=\"" + translation + "\"></button></li>";
    });
    buttons += "<li><button class=\"exit\" type=\"action\" name=\"act_cancel\" data-i18n=\"cancel-u\">CANCEL</button></li>";
    setCharmancerText({ steps: buttons });
    if (eventinfo.triggerName != "l1-welcome") {
        addRepeatingSection("topbar-holder", "topbar");
        recalcData();
        getProficiencies(mancerdata, eventinfo.currentStep);
    }
    getAttrs(["licensedsheet"], function (v) {
        if ("licensedsheet" in v && v.licensedsheet === "1") {
            setCharmancerText({ "sheet-licensedsheet-flag": "true" });
        }
    });
});

on("mancerchange:class_feature_choice_1 mancerchange:class_feature_choice_2", function (eventinfo) {
    var data = getCharmancerData();
    var featureNum = _.last(eventinfo.triggerName.split("_"));
    var update = {};
    var set = {};
    set["class_feature_choice_" + featureNum + "_desc"] = "";
    if (eventinfo.newValue) {
        getCompendiumPage(data["l1-class"].values.class, function (p) {
            p = removeDuplicatedPageData(p);
            var data = p["data"];
            if (data["data-Feature Choices"]) {
                var feature = JSON.parse(data["data-Feature Choices"])[featureNum - 1];
                var featureName = feature.Name;
                var offset = 3;

                if (eventinfo.newValue.split("~")[1] && eventinfo.newValue.split("~")[1] == "DBL") {
                    showChoices(["class_feature_row_" + featureNum + "_manual"]);
                    // var doubleChoiceNum = featureNum + offset;
                    // setCharmancerOptions("class_feature_choice_" + doubleChoiceNum, [eventinfo.newValue]);
                } else {
                    hideChoices(["class_feature_row_" + featureNum + "_manual"]);
                }
                if (data["data-" + featureName + " Data"]) {
                    var json = JSON.parse(data["data-" + featureName + " Data"]);
                    var selected = _.findWhere(json, { Name: eventinfo.newValue });
                    if (selected) {
                        update["class_feature_description_" + featureNum] = selected.Desc;
                        set["class_feature_choice_" + featureNum + "_desc"] = selected.Desc;
                        setAttrs(set);
                        setCharmancerText(update);
                    }
                }
            }
        });
    } else {
        update["class_feature_description_" + featureNum] = "";
        setAttrs(set);
        setCharmancerText(update);
    }
});

on("mancerchange:custom_subclass_cantrip_number mancerchange:custom_subclass_spell_number", function (eventinfo) {
    var section = eventinfo.triggerName.split("_")[2];
    if (eventinfo.newValue && eventinfo.newValue > 0) {
        showChoices(["custom_" + section + "_list"]);
    } else {
        var reset = {};
        reset["custom_subclass_" + section + "_list"] = "";
        hideChoices(["custom_" + section + "_list"]);
        setAttrs(reset);
    }
});

on("mancerchange:background_personality_choice1 mancerchange:background_personality_choice2", function (eventinfo) {
    var mancerdata = getCharmancerData();
    var choices = [];
    if (mancerdata["l1-background"].values["background_personality_choice1"]) choices.push(mancerdata["l1-background"].values["background_personality_choice1"]);
    if (mancerdata["l1-background"].values["background_personality_choice2"]) choices.push(mancerdata["l1-background"].values["background_personality_choice2"]);
    disableCharmancerOptions("background_personality_choice1", choices);
    disableCharmancerOptions("background_personality_choice2", choices);
});

on("mancerroll:background_detail_choice_roll mancerroll:background_personality_choice1_roll mancerroll:background_personality_choice2_roll mancerroll:background_ideal_choice_roll mancerroll:background_bond_choice_roll mancerroll:background_flaw_choice_roll", function (eventinfo) {
    var data = getCharmancerData();
    var index = eventinfo.roll[0].dice[0] - 1;
    var baseName = eventinfo.triggerName.split(":")[1].slice(0, -5);
    var choices = JSON.parse(data["l1-background"].values[baseName + "_array"]);
    setCharmancerOptions(baseName, choices.array, { selected: choices.array[index] });
    if (baseName.slice(0, -1) == "background_personality_choice") {
        var num = baseName.substr(-1) == "1" ? "2" : "1";
        setRollButton(baseName.slice(0, -1) + num, choices.array, choices.name, index + 1);
    }
});

on("clicked:cancel", function () {
    showChoices(["cancel-prompt"]);
    var data = getCharmancerData();
    console.log(data);
    //console.log(recalcData(data));
    //console.log(getProficiencies(data, "finish"));
    //console.log(getRelevantBlobs(data, "1", "l1"));
});

on("clicked:continue", function () {
    hideChoices(["cancel-prompt"]);
});

on("page:l1-spells", function (eventinfo) {
    var stats = recalcData();
    var mancerdata = getCharmancerData();
    var spellData = knownSpells();
    var set = {};
    var titles = {};
    var sorted = {};
    var repids = [];
    var totalchoices = 0;
    var racename = getName("race", mancerdata, true);
    var subracename = getName("subrace", mancerdata, true);
    var classname = getName("class", mancerdata, true);
    var subclassname = getName("subclass", mancerdata, true);
    set["race_spells"] = racename + subracename;
    set["class_spells"] = classname + subclassname;
    set["race_number"] = spellData.race ? spellData.race.choices.length : 0;
    set["class_number"] = spellData.class ? spellData.class.choices.length : 0;

    subracename = getName("subrace", mancerdata) == "" ? "" : " - " + getName("subrace", mancerdata);
    subclassname = getName("subclass", mancerdata) == "" ? "" : " - " + getName("subclass", mancerdata);
    setAttrs(set, function () {
        spellData = knownSpells();
        titles["race"] = getName("race", mancerdata) + subracename;
        titles["class"] = getName("class", mancerdata) + subclassname;

        _.each(["race", "class"], function (section) {
            if (spellData[section]) {
                _.each(spellData[section].known, function (spell) {
                    sorted[spell.Level] = sorted[spell.Level] ? sorted[spell.Level] : {};
                    sorted[spell.Level][section] = sorted[spell.Level][section] ? sorted[spell.Level][section] : { known: [], choices: [] };
                    sorted[spell.Level][section].known.push(spell.Name);
                });
                _.each(spellData[section].choices, function (spell) {
                    sorted[spell.Level] = sorted[spell.Level] ? sorted[spell.Level] : {};
                    sorted[spell.Level][section] = sorted[spell.Level][section] ? sorted[spell.Level][section] : { known: [], choices: [] };
                    sorted[spell.Level][section].choices.push(spell);
                });
            }
        });
        //This is just to get the total number of repeating sections we need. when we've added enough, erase the rest
        _.each(sorted, function (spellarray, level) {
            _.each(spellarray, function (spells, section) {
                totalchoices++;
                _.each(spells.choices, function (spell) {
                    totalchoices++;
                });
            });
        });
        _.each(sorted, function (spellarray, level) {
            _.each(spellarray, function (spells, section) {
                addRepeatingSection("spell_holder", "row", "spellrow", function (rowid) {
                    var repupdate = {};
                    var knownspells = [];
                    var toset = {};
                    repupdate[rowid + " label span"] = level == 0 ? titles[section] + " Cantrips" : titles[section] + " Level " + level;
                    _.each(spells.known, function (spell, index) {
                        var thisSpell = spell;
                        thisSpell += "<button type=\"action\" class=\"choice action mancer_info\" name=\"act_" + rowid + "_known" + index + "\">i</button>";
                        thisSpell += "<input type=\"hidden\" name=\"comp_" + rowid + "_known" + index + "\">";
                        toset[rowid + "_known" + index] = "Spells:" + spell;
                        knownspells.push(thisSpell);
                    });
                    repupdate[rowid + " label p"] = knownspells.join(", ");
                    setAttrs(toset);
                    setCharmancerText(repupdate);
                    repids.push(rowid);
                    _.each(spells.choices, function (spell) {
                        addRepeatingSection(rowid, "choose", section + "_spell-l" + spell.Level, function (id) {
                            var toset = {};
                            var lists = [spell.List];
                            if (spell.AddList) lists = lists.concat(spell.AddList);
                            var choices = "Category:Spells Classes:*" + lists.join("|*") + " Level:" + spell.Level;
                            var settings = { category: "Spells", disable: spellData.known, add: spell["Expanded List"] };
                            toset[id + "_info"] = spell.Ability;
                            if (section != "class") toset[id + "_custom"] = section;
                            repids.push(id);
                            setCharmancerOptions(id + "_choice", choices, settings);
                            setAttrs(toset);
                            showChoices(["action[name=act_" + id + "_action]"]);
                            if (repids.length >= totalchoices) {
                                clearRepeating(repids, "l1-spells");
                            }
                        });
                    });
                });
            })
        });

        if (!spellData.race && !spellData.class) {
            showChoices(["no_spells"]);
            clearRepeatingSections("spell_holder");
        } else {
            showChoices(["spell-info-container"]);
            hideChoices(["no_spells"]);
        }

        setAttrs(set);
    });
});

on("page:l1-feat", function (eventinfo) {
    var stats = recalcData();
    var mancerdata = getCharmancerData();
    var showList = [];
    var hideList = [];

    if (mancerdata["l1-race"] && mancerdata["l1-race"].data.subrace && mancerdata["l1-race"].data.subrace["data-Feats"]) {
        showList = ["yes_feat"];
        hideList = ["no_feat"];
    } else {
        hideList = ["yes_feat"];
        showList = ["no_feat"];
        deleteCharmancerData(["l1-feat"]);
    }

    showChoices(showList);
    hideChoices(hideList);
});

on("mancerchange:feat", function (eventinfo) {
    changeCompendiumPage("sheet-feat-info", eventinfo.newValue);

    var reset = {};
    if (!(eventinfo.newValue === "" || eventinfo.newValue === undefined)) {
        showChoices(["feat_options"]);
    }
    hideChoices(["feat_possible"]);

    if (eventinfo.sourceType == "player") {
        reset = {};
        for (var x = 1; x <= proficiencyNum; x++) {
            //reset["custom_race_prof_name_choice" + x] = "";
            //reset["custom_race_prof_type_choice" + x] = "";
        }
        reset["feat_ability_choice"] = "";
        setCharmancerText({ "feat_text": "" });
    }

    getCompendiumPage(eventinfo.newValue, function (p) {
        p = removeDuplicatedPageData(p);
        setAttrs(reset, function () {
            var mancerdata = getCharmancerData();
            var data = p["data"];
            var showList = [];
            var update = {};

            if (data["data-Ability Score Increase"]) {
                var abilityText = [];
                var json = JSON.parse(data["data-Ability Score Increase"]);
                _.each(json, function (increase, ability) {
                    abilityText.push(ability + " +" + increase);
                });
                update["feat_ability_score"] = abilityText.join(", ");
                showList.push("feat_ability");
            }

            if (data["data-Ability Score Choice"]) {
                var json = JSON.parse(data["data-Ability Score Choice"]);
                setCharmancerOptions("feat_ability_choice", json);
                showList.push("feat_ability", "feat_ability_choice");
            }

            if (data["Prerequisite"]) {
                showList.push("feat_prereq")
                update["feat_prerequisite"] = data["Prerequisite"];
            }
            //feat_ability_choice

            setCharmancerText(update);
            showChoices(showList);
            recalcData();
        });
    });
});

/* BIO PAGE */
on("page:l1-bio", function (eventinfo) {
    const attrs = ["age", "character_name", "eyes", "hair", "height", "weight", "skin"];
    const mancerdata = getCharmancerData();
    const biodata = mancerdata["l1-bio"] || undefined;
    const race = getName("race");

    //Check for any data that has already been filled in and populate the Bio slide
    if (biodata === undefined) {
        getAttrs(attrs, function (v) {
            let update = {};

            _.each(attrs, function (value) {
                if (v[`${value}`] != "" || v[`${value}`] != undefined) {
                    update[`${value}`] = v[`${value}`];
                };
            });

            setAttrs(update);
        });
    };

    //Set the previous_race so the Summary page can offer a warning if needed
    if (biodata === undefined || biodata.values["previous_race"] === undefined || biodata.values["previous_race"] != race) {

        setAttrs({
            previous_race: race
        });
    };

    if (mancerdata["l1-race"] != undefined) {
        const raceInfo = mancerdata["l1-race"].values.race;
        changeCompendiumPage("sheet-race-info", raceInfo);
    };
});

/* SUMMARY PAGE */
on("page:l1-summary", function () {
    var mancerdata = getCharmancerData();
    var profdata = getProficiencies(mancerdata);
    var set = {};
    var racename = getName("race", mancerdata);
    var subracename = getName("subrace", mancerdata);
    var classname = getName("class", mancerdata);
    var subclassname = getName("subclass", mancerdata);
    var bgname = getName("background", mancerdata);
    var spelldata = knownSpells();
    var raceSpells = spelldata.race ? spelldata.race.choices.length : 0;
    var classSpells = spelldata.class ? spelldata.class.choices.length : 0;
    var ready = true;

    var handleMissing = function (section, sectionName) {
        var page = mancerdata["l1-" + section.replace("sub", "")] || false;
        var missing = {};
        var warnings = "";
        sectionName = sectionName || section;
        if (page && page.data && page.data[section]) {
            if (page.data[section]["data-Ability Score Choice"]) {
                var choices = 1;
                if (typeof page.data[section]["data-Ability Score Choice"] == "string") {
                    choices = parseInt(page.data[section]["data-Ability Score Choice"].split("+")[0]);
                }
                var total = choices;
                if (choices >= 2 && page.values[section + "_ability_choice2"]) choices--;
                if (page.values[section + "_ability_choice"]) choices--;
                if (page.values[section + "_ability_choice1"]) choices--;
                if (choices > 0) missing.ability = [total, choices];
            }
            _.each(page.repeating, function (id) {
                if (id.split("_")[2] == section && id.split("_")[3] == "feature") {
                    var featurename = page.values[id + "_info"];
                    if (page.values[id + "_choice"]) {
                        warnings += '<p>Your ' + featurename + ' is ' + _.last(page.values[id + "_choice"].split(":")) + '.</p>'
                    } else {
                        warnings += '<p class="sheet-warning">Your have not chosen a ' + featurename + '.</p>';
                    };
                }
            });
            _.each(proficiencyList, function (prof) {
                var numChoices = 0;
                var totalChoices = 0;
                _.each(page.repeating, function (id) {
                    if (id.split("_")[2] == section && id.split("_")[3] == prof.toLowerCase()) {
                        totalChoices++;
                        numChoices++;
                        if (page.values[id + "_choice"]) {
                            numChoices--;
                            var thischoice = _.last(page.values[id + "_choice"].split(":"));
                            if (thischoice == "custom" && !page.values[id + "_choice"]) {
                                warnings += '<p class="sheet-warning">You\'ve chosen a custom language, but you haven\'t entered a custom language name.</p>';
                            }
                            _.each(profdata.auto, function (profs, source) {
                                if (profs.includes(thischoice)) {
                                    warnings += '<p class="sheet-warning">You\'ve chosen the ' + prof.toLowerCase() + ' ' + thischoice;
                                    warnings += ', but you already have that ' + prof.toLowerCase() + ' from your ' + source + '.</p>';
                                };
                            });
                        }
                    }
                });
                if (numChoices > 0) missing[prof] = [totalChoices, numChoices];
            });
            var total = 0;
            var choices = 0;
            _.each(page.repeating, function (id) {
                if (id.split("_")[2] == section && id.split("_")[3] == "expertise") {
                    total++;
                    choices++;
                    if (page.values[id + "_choice"]) choices--;
                    if (choices > 0) missing.expertise = [total, choices];
                }
            });
        }
        _.each(missing, function (number, type) {
            var singular = type == "ability" ? "an" : "a"
            if (type == "ability") {
                type = 'ability score increase'
            }
            warnings += '<p class="sheet-warning">Your ' + sectionName;
            if (type == "expertise") {
                warnings += " gives you expertise in ";
                warnings += number[0] > 1 ? 'up to ' + number[0] + ' skills' : " a skill";
            } else {
                warnings += " allows you to choose ";
                warnings += number[0] > 1 ? "up to " + number[0] + ' ' + type.toLowerCase() + 's' : singular + " " + type.toLowerCase();
            }
            if (number[0] - number[1] > 0) {
                warnings += ', but you\'ve only chosen ' + number[1] + '!</p>';
            } else {
                warnings += number[0] > 1 ? ', and you haven\'t chosen any!</p>' : ', and you haven\'t chosen one!</p>';
            }
        });
        return warnings;
    };

    ///Show the bio info we need to put in places
    if (mancerdata["l1-bio"]) {
        let length = Object.keys(mancerdata["l1-bio"].values).length;
        set["bio_info"] = "";

        //Check if race has changed since entering data and add a warning
        if (length < 2) {
            set["bio_info"] += '<p>You have not added new information to the Bio tab.</p>';
        } else {
            if (mancerdata["l1-bio"].values.character_name) {
                set["bio_info"] += '<p>Your name is ' + mancerdata["l1-bio"].values.character_name + '.</p>';
            };

            if (mancerdata["l1-bio"].values.age) {
                set["bio_info"] += '<p>Your age is ' + mancerdata["l1-bio"].values.age + '.</p>';
            };

            if (mancerdata["l1-bio"].values["height"]) {
                set["bio_info"] += '<p>Your height is ' + mancerdata["l1-bio"].values["height"] + '.</p>';
            };

            if (mancerdata["l1-bio"].values.weight) {
                set["bio_info"] += '<p>Your weight is ' + mancerdata["l1-bio"].values.weight + '.</p>';
            };

            if (mancerdata["l1-bio"].values.eyes) {
                set["bio_info"] += '<p>Your eye color is ' + mancerdata["l1-bio"].values.eyes + '.</p>';
            };

            if (mancerdata["l1-bio"].values.hair) {
                set["bio_info"] += '<p>Your hair is ' + mancerdata["l1-bio"].values.hair + '.</p>';
            };

            if (mancerdata["l1-bio"].values.skin) {
                set["bio_info"] += '<p>Your skin is ' + mancerdata["l1-bio"].values.skin + '.</p>';
            };

            if (mancerdata["l1-bio"].values.previous_race != racename) {
                setCharmancerText({
                    race_warning: '<p class="sheet-warning">Each race has unique look and different names. You might want to adjust your choices to reflect your race.</p>'
                });
            };
        };
    };

    if (mancerdata["l1-race"] && racename) {
        set["race_info"] = '<p>Your race is ' + racename + '</p>';
        if (!mancerdata["l1-race"].values.alignment) set["race_info"] += '<p class="sheet-warning">You haven\'t chosen your alignment.</p>';
        set["race_info"] += handleMissing("race");
        if (mancerdata["l1-race"].values["has_subrace"] == "true") {
            if (subracename) {
                set["race_info"] += '<p>Your subrace is ' + subracename + '</p>';
                set["race_info"] += handleMissing("subrace");
            } else {
                if (mancerdata["l1-race"].values.subrace == "Rules:Races" && !mancerdata["l1-race"].values.subrace_name) {
                    set["race_info"] = '<p class="sheet-warning sheet-needed">You need to pick a name for your custom subrace!</p>';
                } else {
                    set["race_info"] += '<p class="sheet-warning sheet-needed">You have not selected a subrace!</p>';
                }
                ready = false;
                showChoices(["race_button"]);
            }
        }
        _.each(spelldata.errors.race, function (error) {
            switch (error) {
                case "custom_race_spell_list":
                    set["race_info"] += '<p class="sheet-warning sheet-needed">You have not selected spell list for your innate spellcasting!</p>';
                    ready = false;
                    break;
                default:
                    console.log("Unknown race spell error: " + error);
            }
        });
        if (mancerdata["l1-race"].values.race == "Rules:Races") {
            if (!mancerdata["l1-race"].values.size) set["race_info"] += '<p class="sheet-warning">You have not selected a size for your custom race!</p>';
            if (!mancerdata["l1-race"].values.speed) set["race_info"] += '<p class="sheet-warning">You have not selected a walking speed for your custom race!</p>';
        }
    } else {
        if (mancerdata["l1-race"] && mancerdata["l1-race"].values.race == "Rules:Races" && !mancerdata["l1-race"].values.race_name) {
            set["race_info"] = '<p class="sheet-warning sheet-needed">You need to pick a name for your custom race!</p>';
        } else {
            set["race_info"] = '<p class="sheet-warning sheet-needed">You have not selected a race!</p>';
        }
        ready = false;
        showChoices(["race_button"]);
    }

    if (mancerdata["l1-class"] && classname) {
        set["class_info"] = '<p>Your class is ' + classname + '.</p>';
        set["class_info"] += handleMissing("class");
        if (mancerdata["l1-class"].values.race == "Rules:Classes" && !mancerdata["l1-class"].values.custom_hit_die) {
            set["class_info"] = '<p class="sheet-warning">You need to pick a hit die for your custom class!</p>';
        }
        if (mancerdata["l1-class"].data.class && mancerdata["l1-class"].data.class["data-Subclass Level"] == 1) {
            if (subclassname && mancerdata["l1-class"].data.class && mancerdata["l1-class"].data.class["data-Subclass Level"] == 1) {
                set["class_info"] += '<p>Your ' + mancerdata["l1-class"].data.class["Subclass Name"] + ' is ' + subclassname + '.</p>';
                set["class_info"] += handleMissing("subclass", mancerdata["l1-class"].data.class["Subclass Name"]);
            } else {
                if (mancerdata["l1-class"].values.subclass == "Rules:Classes" && !mancerdata["l1-class"].values.subrace_name) {
                    set["class_info"] = '<p class="sheet-warning sheet-needed">You need to pick a name for your custom ' + mancerdata["l1-class"].data.class["Subclass Name"] + '!</p>';
                } else {
                    set["class_info"] += '<p class="sheet-warning sheet-needed">You have not selected a ' + mancerdata["l1-class"].data.class["Subclass Name"] + '!</p>';
                }
                ready = false;
                showChoices(["class_button"]);
            }
        }
        _.each(spelldata.errors.class, function (error) {
            switch (error) {
                case "custom_class_spell_list":
                    set["race_info"] += '<p class="sheet-warning sheet-needed">You have selected a spellcasting ability for your custom class, but you have not selected a spell list.</p>';
                    ready = false;
                    showChoices(["class_button"]);
                    break;
                case "custom_class_spell_number":
                    set["race_info"] += '<p class="sheet-warning sheet-needed">You have selected a spellcasting ability for your custom class, but you have not selected a number of spells.</p>';
                    ready = false;
                    showChoices(["class_button"]);
                    break;
                default:
                    console.log("Unknown class spell error: " + error);
            }
        });
    } else {
        if (mancerdata["l1-class"] && mancerdata["l1-class"].values.race == "Rules:Classes" && !mancerdata["l1-class"].values.race_name) {
            set["class_info"] = '<p class="sheet-warning sheet-needed">You need to pick a name for your custom class!</p>';
        } else {
            set["class_info"] = '<p class="sheet-warning sheet-needed">You have not selected a class!</p>';
        }
        ready = false;
        showChoices(["class_button"]);
    }

    if (mancerdata["l1-abilities"] && mancerdata["l1-abilities"].values.abilities) {
        switch (mancerdata["l1-abilities"].values.abilities) {
            case "Standard Array":
                set["ability_info"] = '<p>You generated your stats from the standard array.</p>';
                break;
            case "Roll for Stats":
                set["ability_info"] = '<p>You generated your stats by rolling.</p>';
                break;
            case "Point Buy":
                set["ability_info"] = '<p>You generated your stats with the point buy method.</p>';
                break;
            case "custom":
                set["ability_info"] = '<p>You entered custom values for your stats.</p>';
                break;
        }
        var x = 0;
        _.each(abilityList, function (ability) {
            if (!mancerdata["l1-abilities"].values[ability.toLowerCase()]) {
                x++;
                set["ability_info"] += '<p class="sheet-warning sheet-needed">You have not selected a score for your ' + ability.toLowerCase() + '!</p>';
                ready = false;
                showChoices(["abilities_button"]);
            }
        });
        if (x == 6) set["ability_info"] = '<p class="sheet-warning">You have not selected your ability scores!</p>';
    } else {
        set["ability_info"] = '<p class="sheet-warning sheet-needed">You have not generated your ability scores!</p>';
        ready = false;
        showChoices(["abilities_button"]);
    }

    if (mancerdata["l1-background"] && bgname) {
        set["background_info"] = '<p>You come from a ' + bgname + ' background.</p>';
        if (mancerdata["l1-background"].data.background && mancerdata["l1-background"].data.background["data-Background Choice Name"]) {
            if (!mancerdata["l1-background"].values["background_detail_choice"]) {
                set["background_info"] += '<p class="sheet-warning">You haven\'t chosen your ';
                set["background_info"] += mancerdata["l1-background"].data.background["data-Background Choice Name"] + '.</p>';
            }
        }
        if (!mancerdata["l1-background"].values["background_personality_choice1"] && !mancerdata["l1-background"].values["background_personality_choice2"]) {
            set["background_info"] += '<p class="sheet-warning">You haven\'t picked your personality traits.</p>';
        } else if (!mancerdata["l1-background"].values["background_personality_choice1"] || !mancerdata["l1-background"].values["background_personality_choice2"]) {
            set["background_info"] += '<p class="sheet-warning">You haven\'t picked one of your personality traits.</p>';
        }
        if (!mancerdata["l1-background"].values["background_ideal_choice"]) {
            set["background_info"] += '<p class="sheet-warning">You haven\'t chosen your ideal.</p>';
        }
        if (!mancerdata["l1-background"].values["background_bond_choice"]) {
            set["background_info"] += '<p class="sheet-warning">You haven\'t chosen your bond.</p>';
        }
        if (!mancerdata["l1-background"].values["background_flaw_choice"]) {
            set["background_info"] += '<p class="sheet-warning">You haven\'t chosen your flaw.</p>';
        }
        set["background_info"] += handleMissing("background");
    } else {
        set["background_info"] = '<p class="sheet-warning sheet-needed">You have not selected a background!</p>';
        ready = false;
        showChoices(["background_button"]);
    }

    if (mancerdata["l1-equipment"] && mancerdata["l1-equipment"].values["equipment_type"]) {
        switch (mancerdata["l1-equipment"].values["equipment_type"]) {
            case "class":
                set["equipment_info"] = '<p>You got starting equipment based on your class and background.</p>';
                break;
            case "gold":
                set["equipment_info"] = '<p>You opted for gold instead of starting equipment.</p>';
                break;
        }
        if (mancerdata["l1-equipment"].values["equipment_type"] == "class") {
            var choices = { "class": [0, 0], "background": [0, 0] };
            _.each(choices, function (numbers, section) {
                var equipment = mancerdata["l1-" + section].data[section] && mancerdata["l1-" + section].data[section]["data-Equipment"] ? mancerdata["l1-" + section].data[section]["data-Equipment"] : {};
                _.each(equipment, function (choice, choicekey) {
                    if (choicekey != "default") numbers[0]++;
                });
                _.each(mancerdata["l1-equipment"].values, function (val, key) {
                    if (key.includes(section + "_equipment_choice")) numbers[1]++;
                });
            });
            _.each(choices, function (number, type) {
                if (number[0] - number[1] > 0) {
                    set["equipment_info"] += '<p class="sheet-warning">Your ' + type + ' gives you ';
                    set["equipment_info"] += number[0] > 1 ? number[0] + " equipment choices" : "an equipment choice";
                    if (number[1] > 0) {
                        set["equipment_info"] += ', but you\'ve only chosen ' + number[1] + '!</p>';
                    } else {
                        set["equipment_info"] += number[0] > 1 ? ', and you haven\'t chosen any!</p>' : ', and you haven\'t chosen it!</p>';
                    }
                }
            });
        }
        if (mancerdata["l1-equipment"].values["equipment_type"] == "gold" && mancerdata["l1-equipment"].values["starting_gold"] == "0") {
            set["equipment_info"] = '<p class="sheet-warning">You selected starting wealth for your equipment, but you don\'t have any gold yet!</p>';
        }
        if (mancerdata["l1-equipment"].values["equipment_class"] != getName("class", mancerdata, true) || (mancerdata["l1-equipment"].values["equipment_background"] != getName("background", mancerdata, true) && mancerdata["l1-equipment"].values["equipment_type"] != "gold")) {
            set["equipment_info"] = '<p class="sheet-warning sheet-needed">Your equipment options have changed, you\'ll need to choose again.</p>';
            ready = false;
            showChoices(["equipment_button"]);
        }
    } else {
        set["equipment_info"] = '<p class="sheet-warning sheet-needed">You have not selected any equipment!</p>';
        ready = false;
        showChoices(["equipment_button"]);
    }

    var spellsready = true;
    var toDelete = [];
    if (mancerdata["l1-spells"]) {
        prevRace = mancerdata["l1-spells"].values.race_spells || "";
        prevClass = mancerdata["l1-spells"].values.class_spells || "";
        currentRace = getName("race", mancerdata, true) + getName("subrace", mancerdata, true);
        currentClass = getName("class", mancerdata, true) + getName("subclass", mancerdata, true);
        set["spell_info"] = "";
        if ((raceSpells + classSpells) == 0) {
            set["spell_info"] += '<p>The arcane is a mystery to you.</p>';
            deleteCharmancerData(["l1-spells"]);
            spellsready = false;
        } else if (prevRace != currentRace || prevClass != currentClass || mancerdata["l1-spells"].values.race_number != raceSpells || mancerdata["l1-spells"].values.class_number != classSpells) {
            if (prevRace != currentRace || mancerdata["l1-spells"].values.race_number > raceSpells) {
                for (var x = 1; x <= 9; x++) {
                    toDelete.push("race_level0_choice" + x);
                    toDelete.push("race_level1_choice" + x);
                }
                if (raceSpells > 0 && mancerdata["l1-spells"].values.race_number > 0) {
                    set["spell_info"] += '<p class="sheet-warning">Your racial spells were reset because your options have changed.</p>';
                }
            }
            if (prevClass != currentClass || mancerdata["l1-spells"].values.class_number > classSpells) {
                for (var x = 1; x <= 9; x++) {
                    toDelete.push("class_level0_choice" + x);
                    toDelete.push("class_level1_choice" + x);
                }
                if (classSpells > 0 && mancerdata["l1-spells"].values.class_number > 0) {
                    set["spell_info"] += '<p class="sheet-warning">Your class spells were reset because your options have changed.</p>';
                }
            }
        }
    } else if ((raceSpells + classSpells) > 0) {
        set["spell_info"] = '<p class="sheet-warning">You haven\'t selected your spells!</p>';
        spellsready = false;
        showChoices(["spells_button"]);
    } else {
        set["spell_info"] = '<p>The arcane is a mystery to you.</p>';
        spellsready = false
    }

    if (mancerdata["l1-race"] && mancerdata["l1-race"].data.subrace && mancerdata["l1-race"].data.subrace["data-Feats"]) {
        if (mancerdata["l1-feat"] && mancerdata["l1-feat"].values.feat) {
            set["feat_info"] = '<p>You\'ve selected the ' + mancerdata["l1-feat"].values.feat.split(":")[1] + ' feat.</p>';
            set["feat_info"] += handleMissing("feat");
        } else {
            set["feat_info"] = '<p class="sheet-warning">You have access to a feat, but you have not yet selected one!</p>';
        }
    } else {
        set["feat_info"] = '<p>As you exchange your novice notions of the world for experience, a feat may become within reach. Not today, however.</p>';
        deleteCharmancerData(["l1-feat"]);
    }

    if (ready) {
        set.ready_message = "If you're ready to build your " + racename;
        set.ready_message += subracename == "" ? " " : " (" + subracename + ") ";
        set.ready_message += subclassname == "" ? classname : classname + " (" + subclassname + ")";
        set.ready_message += " from a " + bgname + " background, click \"Apply Changes.\"";
        showChoices(["apply_changes", "ready_text"]);
    } else {
        set.ready_message = "Hold on there! You've missed some required fields, which have been marked with a <span class='sheet-needed'></span>.";
    }
    //If you're ready to build your race class from a background background, click "Apply Changes."
    deleteCharmancerData([{ "l1-spells": toDelete }], function () {
        spelldata = knownSpells();
        if (spellsready) {
            if (spelldata.known && spelldata.known.length) {
                set["spell_info"] += '<p>You know these spells: ' + removeExpansionInfo(spelldata.known.join(", ")) + '.</p>';
            }
            var choices = { "cantrip": [0, 0], "spell": [0, 0] };
            _.each(spelldata, function (section) {
                _.each(section.choices, function (spell) {
                    if (spell.Level == 0) choices.cantrip[0]++;
                    if (spell.Level == 1) choices.spell[0]++;
                });
            });
            choices.cantrip[1] = choices.cantrip[0];
            choices.spell[1] = choices.spell[0];
            _.each(mancerdata["l1-spells"].values, function (val, name) {
                if (name.split("_")[3] == "spell-l0" && _.last(name.split("_")) == "choice") choices.cantrip[1]--;
                if (name.split("_")[3] == "spell-l1" && _.last(name.split("_")) == "choice") choices.spell[1]--;
            });
            _.each(choices, function (number, type) {
                if (number[1] > 0) {
                    set["spell_info"] += '<p class="sheet-warning">You can choose ';
                    set["spell_info"] += number[0] > 1 ? "up to " + number[0] + ' ' + type + 's' : "a " + type;
                    if (number[1] < number[0]) {
                        set["spell_info"] += ', but you\'ve only chosen ' + (number[0] - number[1]) + '!</p>';
                    } else {
                        set["spell_info"] += number[0] > 1 ? ', and you haven\'t chosen any!</p>' : ', and you haven\'t chosen one!</p>';
                    }
                }
            });
        }
        setCharmancerText(set);
    });
});

/* Info Button Listeners */
on("clicked:info_race", function (eventinfo) {
    var data = getCharmancerData();
    var race = data["l1-race"] && data["l1-race"].values.race ? data["l1-race"].values.race : "Rules:Races";
    changeCompendiumPage("sheet-race-info", race);
});

on("clicked:info_subrace", function (eventinfo) {
    var data = getCharmancerData();
    var subrace = data["l1-race"] && data["l1-race"].values.subrace ? data["l1-race"].values.subrace : data["l1-race"].values.race;
    changeCompendiumPage("sheet-race-info", subrace);
});

on("clicked:info_class", function (eventinfo) {
    var data = getCharmancerData();
    var oclass = data["l1-class"] && data["l1-class"].values.class ? data["l1-class"].values.class : "Rules:Classes";
    changeCompendiumPage("sheet-class-info", oclass);
});

on("clicked:info_subclass", function (eventinfo) {
    var data = getCharmancerData();
    var osubclass = data["l1-class"] && data["l1-class"].values.subclass ? data["l1-class"].values.subclass : data["l1-class"].values.class;
    changeCompendiumPage("sheet-class-info", osubclass);
});

on("mancerfinish:l1-mancer", function (eventinfo) {
    var doAllDrops = function (dropArray, callback) {
        getAttrs(["character_id"], function (v) {
            _.each(stats.totals, function (scores, name) {
                v[name + "_base"] = scores.total;
                v[name + "_mod"] = scores.mod;
            });
            v.base_level = "1";
            v.npc = "0";
            v["class_resource_name"] = "";
            v["other_resource_name"] = "";
            var update = {};
            var callbacks = [];
            var totalDrops = dropArray.length;
            var x = 0;
            callbacks.push(update_class);
            callbacks.push(update_race_display);
            get_repeating_data(function (repeating) {
                _.each(dropArray, function (page) {
                    page.data.Category = page.data.Category.replace("@@!!@@", "");
                    var dropUpdate = processDrop(page, v, repeating, true);
                    callbacks = callbacks.concat(dropUpdate.callbacks);
                    repeating.prof_names = _.uniq(repeating.prof_names.concat(dropUpdate.prof_names));
                    update = _.extend(update, dropUpdate.update);
                    x++;
                    setCharmancerText({ "mancer_progress": '<div style="width: ' + (parseInt(x / totalDrops * 70) + 20) + '%"></div>' });
                });

                callbacks.push(function () { update_ac(); });
                callbacks.push(function () { update_weight(); });
                callbacks.push(callback);
                console.log(update);
                setAttrs(update, { silent: true }, function () {
                    setCharmancerText({ "mancer_progress": '<div style="width: 95%"></div>' });
                    _.each(callbacks, function (callback) {
                        callback();
                    });
                });/**/
            });
        });
    };
    var getOtherDrops = function (pagedata) {
        var results = [];
        if (pagedata["data-Equipment"]) {
            console.log("ADDING ADDITIONAL ITEMS:");
            var json = {};
            try {
                json = JSON.parse(pagedata["data-Equipment"]);
            } catch (e) {
                json = pagedata["data-Equipment"];
            }
            var newItems = makeItemData(json.default);
            results = results.concat(newItems);
        }
        if (pagedata["data-Bundle"]) {
            console.log("ADDING ADDITIONAL ITEMS (FROM BUNDLE):");
            var json = {};
            try {
                json = JSON.parse(pagedata["data-Bundle"]);
            } catch (e) {
                json = pagedata["data-Bundle"];
            }
            var newItems = makeItemData(json);
            results = results.concat(newItems);
        }
        return results;
    };
    var getAllPages = function (pageArray, callback) {
        var getNames = [];
        _.each(pageArray, function (page) {
            if (page.name) {
                getNames.push(page.name);
            } else {
                getNames.push(page);
            }
        });
        getCompendiumPage(getNames, function (data) {
            data = removeDuplicatedPageData(data);
            var nextGet = [];
            if (getNames.length === 1) { data = { 0: data } }; //Fix single spell selections failing.
            _.each(data, function (page, index) {
                var pagedata = false;
                _.each(pageArray, function (arrayData) {
                    if (arrayData.name.toLowerCase() == (page.data.Category + ":" + page.name).toLowerCase()) {
                        pagedata = arrayData;
                    }
                });
                if (pagedata && pagedata.data) {
                    page.data = _.extend(page.data, pagedata.data);
                }
                if (!page.id) page.data.Source = "Charactermancer";
                page.name = page.name.replace(/@@!!@@/g, ""); // Hacky bugfix to prevent custom names from matching unavailable content
                nextGet = nextGet.concat(getOtherDrops(page.data));
                if (page.data["data-Starting Gold"] && !noEquipmentDrop) {
                    set["gp"] += parseInt(page.data["data-Starting Gold"]);
                }
                allPageData.push(page);
            });

            if (nextGet.length > 0) {
                console.log("DOING ANOTHER GET!!");
                getAllPages(nextGet, callback);
            } else {
                callback();
            }

        });
    };
    var makeItemData = function (items) {
        if (noEquipmentDrop) {
            return [];
        } else {
            var itemArray = [];
            var splitItems = [];
            _.each(items, function (item) {
                item = item.split(",");
                _.each(item, function (splitItem) {
                    splitItems.push(splitItem.trim());
                });
            })
            _.each(splitItems, function (item) {
                var itemname = item.split("(")[0].trim().replace("Items:", "");
                itemname = itemname.substring(0, 4) == "and " ? itemname.substr(4) : itemname;
                var itemdata = { name: "Items:" + itemname, data: {} }
                if (item.includes("(")) {
                    var par = item.split("(")[1].split(")")[0];
                    if (!isNaN(parseInt(par))) {
                        itemdata.data["itemcount"] = parseInt(par);
                    }
                }
                if (itemname != "") {
                    itemArray.push(itemdata);
                }
            });
            return itemArray;
        }
    };
    var eraseRepeating = function (sectionArray, callback) {
        var thisSection = sectionArray.shift();
        getSectionIDs(thisSection, function (itemids) {
            _.each(itemids, function (item) {
                removeRepeatingRow("repeating_" + thisSection + "_" + item);
            });
            if (sectionArray.length > 0) {
                eraseRepeating(sectionArray, callback);
            } else {
                callback();
            }

        });
    };
    var noEquipmentDrop = false;
    var startTime = Date.now();
    var allPageData = [];
    if (eventinfo.data["l1-equipment"]) {
        noEquipmentDrop = eventinfo.data["l1-equipment"].values["equipment_type"] == "gold";
    }
    var data = eventinfo.data;
    var stats = recalcData(data);
    var profs = getProficiencies(data, "finish");
    var spells = knownSpells(data);
    var blobs = getRelevantBlobs(data, "1", "l1");
    var customtraits = { race: [], subrace: [], class: [], subclass: [], background: [] };
    var equipment = [];
    var silentset = {};
    var silentattrs = ["class_resource_name", "class_resource", "class_resource_max", "other_resource_name", "other_resource", "other_resource_max", "other_resource_itemid", "class", "class_display", "subclass", "hitdietype", "hitdie_final", "race", "subrace", "race_display", "custom_class", "cust_classname"];
    var clearset = {};
    var clearattrs = ["hp", "hp_max", "size", "speed", "gp", "alignment", "global_damage_mod_flag", "spellcasting_ability", "cust_hitdietype", "cust_spellslots", "cust_spellcasting_ability", "ac", "jack_bonus", "jack_attr", "death_save_bonus", "weighttotal", "initiative_bonus", "hit_dice", "hit_dice_max", "pb", "jack", "caster_level", "spell_attack_mod", "spell_attack_bonus", "spell_save_dc", "passive_wisdom", "custom_ac_base", "custom_ac_part1", "custom_ac_part2", "custom_ac_shield", "background", "global_ac_mod_flag", "global_attack_mod_flag", "global_save_mod_flag", "global_skill_mod_flag"];
    var classname = "";
    var set = { gp: 0 };
    var allDrops = [];
    var currentDrop = 0;
    var totalDrops = 1;
    var allSkills = ["athletics", "acrobatics", "sleight_of_hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal_handling", "insight", "medicine", "perception", "survival", "deception", "intimidation", "performance", "persuasion"];
    var allAbilities = abilityList.map(function (x) { return x.toLowerCase() });
    var eraseSections = ["attack", "inventory", "traits", "resource", "proficiencies", "tool", "damagemod", "spell-cantrip", "hpmod", "acmod", "tohitmod", "savemod", "skillmod"];
    console.log(blobs);
    console.log(spells);
    for (var x = 1; x <= 9; x++) {
        eraseSections.push("spell-" + x);
    }
    //first set is silent to make sure certain things don't trigger workers
    _.each(silentattrs, function (attr) {
        silentset[attr] = "";
    });
    //Set up setAttrs to erase some fields
    _.each(clearattrs, function (attr) {
        clearset[attr] = "";
    });
    clearset["halflingluck_flag"] = "0";
    clearset["tab"] = "core";
    clearset["base_level"] = "1";
    clearset["level"] = "1";
    clearset["armorwarningflag"] = "hide";
    clearset["customacwarningflag"] = "hide";
    clearset["custom_ac_flag"] = "0";
    clearset["custom_attack_flag"] = "0";
    clearset["custom_ac_flag"] = "0";
    clearset["multiclass1_flag"] = "0";
    clearset["multiclass1_lvl"] = "1";
    clearset["multiclass2_flag"] = "0";
    clearset["multiclass2_lvl"] = "1";
    clearset["multiclass3_flag"] = "0";
    clearset["multiclass3_lvl"] = "1";
    clearset["custom_class"] = "0";
    _.each(allSkills, function (skill) {
        clearset[skill + "_prof"] = "";//0
        clearset[skill + "_type"] = "";//1
        clearset[skill + "_bonus"] = "";
    });
    _.each(allAbilities, function (ability) {
        clearset[ability + "_save_prof"] = "";
        clearset[ability + "_save_bonus"] = "";
        clearset[ability + "_bonus"] = "0";
        clearset["cust_" + ability + "_save_prof"] = "";
    });
    clearset["personality_traits"] = "";
    _.each(["ideal", "bond", "flaw"], function (type) {
        clearset[type + "s"] = "";
    });
    //Set up second setAttrs with ability scores
    _.each(stats.totals, function (scores, name) {
        clearset[name + "_base"] = scores.total;
    });
    // Build new blobs for traits with inputs, collect custom traits and languages
    _.each(data, function (slide, pagename) {
        _.each(slide.values, function (value, name) {
            if (name.substr(-11) == "trait_input") {
                var sectionid = name.substring(0, name.length - 6);
                var thisblob = {};
                var thistrait = {};
                thistrait.Name = slide.values[sectionid + "_name"].replace(/{{Input}}/g, value);
                thistrait.Desc = slide.values[sectionid + "_desc"] ? slide.values[sectionid + "_desc"].replace(/{{Input}}/g, value) : "";
                thisblob.Traits = JSON.stringify([thistrait]);
                blobs.names[slide.values[sectionid + "_section"]].push(sectionid);
                slide.data[slide.values[sectionid + "_section"]].blobs[sectionid] = thisblob;
            }
            if (name.split("_")[2] == "custom" && name.substr(-10) == "trait_name") {
                var sectionid = name.substring(0, name.length - 5);
                var thistrait = {};
                thistrait.Name = slide.values[sectionid + "_name"];
                thistrait.Desc = slide.values[sectionid + "_desc"] ? slide.values[sectionid + "_desc"] : "";
                customtraits[name.split("_")[3]].push(thistrait);
            }
            if (value == "custom" && name.substr(-18) == "proficiency_choice") {
                var sectionid = name.substring(0, name.length - 7);
                if (slide.values[sectionid + "_custom"] && slide.values[sectionid + "_type"]) {
                    profs.all[slide.values[sectionid + "_type"]].push(slide.values[sectionid + "_custom"])
                }
            }
        })
    });
    //Set up drops. start with class, subclass, race, subrace, background
    if (data["l1-class"].values["class_name"] && !data["l1-class"].data.class) {
        classname = removeExpansionInfo(data["l1-class"].values["class_name"]);
        var customClass = { name: classname, data: { Category: "Classes", blobs: {} } };
        set["custom_class"] = "1";
        set["cust_classname"] = data["l1-class"].values["class_name"];
        set["cust_hitdietype"] = data["l1-class"].values["custom_hit_die"];
        if (data["l1-class"].values["custom_class_spell_ability"]) {
            set["cust_spellslots"] = "full";
            set["cust_spellcasting_ability"] = "@{" + data["l1-class"].values["custom_class_spell_ability"].toLowerCase() + "_mod}+";
        }
        if (customtraits.class.length > 0) {
            customClass.data.theseblobs = ["customblob"];
            customClass.data.blobs.customblob = { Traits: JSON.stringify(customtraits.class) };
        }
        _.each(allAbilities, function (ability) {
            if (data["l1-class"].values[ability.toLowerCase() + "_save"]) {
                set["cust_" + ability + "_save_prof"] = "(@{pb})";
            }
        });
        allPageData.push(customClass);
    } else {
        //allDrops.push(data["l1-class"].values.class);
        classname = removeExpansionInfo(_.last(data["l1-class"].values.class.split(":")));
        var thisdata = { name: classname, data: data["l1-class"].data.class };
        thisdata.data.theseblobs = blobs.names.class;
        allPageData.push(thisdata);
    };
    //set up subclass drop
    if (data["l1-class"].values.subclass && data["l1-class"].values["subclass_name"]) {
        var customSubclass = { name: removeExpansionInfo(data["l1-class"].values["subclass_name"]), data: { Category: "Subclasses", blobs: {} } };
        if (customtraits.subclass.length > 0) {
            customSubclass.data.theseblobs = ["customblob"];
            customSubclass.data.blobs.customblob = { Traits: JSON.stringify(customtraits.subclass) };
        }
        allPageData.push(customSubclass);
    } else if (data["l1-class"].values.subclass) {
        //allDrops.push(data["l1-class"].values.subclass);
        var thisdata = { name: removeExpansionInfo(_.last(data["l1-class"].values.subclass.split(":"))), data: data["l1-class"].data.subclass };
        thisdata.data.theseblobs = blobs.names.subclass;
        allPageData.push(thisdata);
    };
    //set up race drop
    if (data["l1-race"].values["race_name"] && !data["l1-race"].data.race) {
        var customRace = { name: removeExpansionInfo(data["l1-race"].values["race_name"]), data: { Category: "Races", blobs: {} } };
        if (data["l1-race"].values.size) {
            customRace.data.Size = data["l1-race"].values.size;
        }
        if (data["l1-race"].values.speed) {
            customRace.data.Speed = data["l1-race"].values.speed;
        }
        if (customtraits.race.length > 0) {
            customRace.data.theseblobs = ["customblob"];
            customRace.data.blobs.customblob = { Traits: JSON.stringify(customtraits.race) };
        }
        allPageData.push(customRace);
    } else {
        //allDrops.push(data["l1-race"].values.race);
        var thisdata = { name: removeExpansionInfo(_.last(data["l1-race"].values.race.split(":"))), data: data["l1-race"].data.race };
        thisdata.data.theseblobs = blobs.names.race;
        allPageData.push(thisdata);
    }
    //set up subrace drop
    if (data["l1-race"].values.subrace && data["l1-race"].values["subrace_name"]) {
        var customSubrace = { name: removeExpansionInfo(data["l1-race"].values["subrace_name"]), data: { Category: "Subraces", blobs: {} } };
        customSubrace.data["data-Parent"] = data["l1-race"].values.race.split(":")[1];
        if (data["l1-race"].values.speed) {
            customSubrace.data.Speed = data["l1-race"].values.speed;
        }
        if (customtraits.subrace.length > 0) {
            customSubrace.data.theseblobs = ["customblob"];
            customSubrace.data.blobs.customblob = { Traits: JSON.stringify(customtraits.subrace) };
        }
        allPageData.push(customSubrace);
    } else if (data["l1-race"].values.subrace) {
        //allDrops.push(data["l1-race"].values.subrace);
        var thisdata = { name: removeExpansionInfo(_.last(data["l1-race"].values.subrace.split(":"))), data: data["l1-race"].data.subrace };
        thisdata.data.theseblobs = blobs.names.subrace;
        allPageData.push(thisdata);
    };
    //set up feat drop
    if (data["l1-feat"] && data["l1-feat"].values.feat) {
        var feat = { name: data["l1-feat"].values.feat, data: { Properties: "1st Level" } };
        allDrops.push(feat);
    }
    //set up background drop
    if (data["l1-background"].values.background) {
        if (data["l1-background"].values.background == "Rules:Backgrounds") {
            var customBg = { name: removeExpansionInfo(data["l1-background"].values["background_name"]), data: { Category: "Backgrounds", blobs: {} } };
            if (customtraits.background.length > 0) {
                customBg.data.theseblobs = ["customblob"];
                customBg.data.blobs.customblob = { Traits: JSON.stringify(customtraits.background) };
            }
            allPageData.push(customBg);
        } else {
            var thisdata = { name: removeExpansionInfo(_.last(data["l1-background"].values.background.split(":"))), data: data["l1-background"].data.background };
            thisdata.data.theseblobs = blobs.names.background;
            allPageData.push(thisdata);
        }
    }

    //Now add proficiency drops
    _.each(["Armor", "Language", "Tool", "Weapon"], function (proftype) {
        _.each(profs.all[proftype], function (prof) {
            var profdata = { name: "Proficiencies:" + prof, data: { Type: proftype } }
            if (profs.all.Expertise.indexOf(prof) != -1) {
                profdata.data["toolbonus_base"] = "(@{pb}*2)";
                allDrops.unshift(profdata);
            } else {
                allDrops.push(profdata);
            }
        });
    });

    //Next, add spell drops
    _.each(spells.all, function (spell) {
        console.log(spell);
        var spelldata = { name: "Spells:" + spell.Name };
        spelldata.data = { "spellcasting_ability": spell.Ability };
        if (spell.Source == "race") {
            spelldata.data.spellclass = "Racial";
        } else {
            spelldata.data.spellclass = classname;
        };
        allDrops.push(spelldata);
    });
    //Add equipment choice drops unless starting gold was chosen
    if (data["l1-equipment"].values["equipment_type"] != "gold") {
        _.each(data["l1-equipment"].values, function (val, name) {
            if (name.includes("background_equipment_choice")) {
                equipment = equipment.concat(val.split(" and "));
            }
        });
        _.each(blobs.all, function (blob) {
            if (blob.Equipment) {
                var blobstuff = blob.Equipment;
                try {
                    blobstuff = JSON.parse(blob.Equipment);
                } catch (e) { }
                equipment = equipment.concat(blobstuff);
            }
        })
    }

    //Here there is a window to modify the hitpoints, however additional hitpoints inserted here would not appear on charatermancer header
    //By Miguel

    //Set up the final setAttrs()
    set["alignment"] = data["l1-race"].values.alignment || "";
    set["hp"] = stats.hp;
    set["hp_max"] = stats.hp;
    set["l1mancer_status"] = "completed";
    set["options-class-selection"] = "0";
    if (data["l1-equipment"].values["equipment_type"] == "class") {
        _.each(data["l1-equipment"].values, function (val, name) {
            if (name.includes("class_equipment_choice")) {
                equipment = equipment.concat(val.split(" and "));
            }
        });
    } else if (data["l1-equipment"].values["equipment_type"] == "gold" && data["l1-equipment"].values["starting_gold"]) {
        set["gp"] = parseInt(data["l1-equipment"].values["starting_gold"]);
    }
    //Add the bio info
    if (data["l1-bio"]) {
        _.each(["character_name", "age", "height", "weight", "eyes", "hair", "skin"], function (type) {
            if (data["l1-bio"].values[type]) {
                set[type] = data["l1-bio"].values[type] || "";
            }
        });
    }
    //Add skill proficiencies
    _.each(_.uniq(profs.all.Skill.concat(profs.all.Expertise)), function (prof) {
        var profName = prof.toLowerCase().replace(/ /g, "_");
        set[profName + "_prof"] = "(@{pb}*@{" + profName + "_type})";
        if (profs.all.Expertise.indexOf(prof) != -1) {
            set[profName + "_type"] = 2;
        }
    });
    //Add background traits
    if (data["l1-background"].values["background_personality_choice1"] || data["l1-background"].values["background_personality_choice2"]) {
        var choice1 = data["l1-background"].values["background_personality_choice1"] || false;
        var choice2 = data["l1-background"].values["background_personality_choice2"] || false;
        choice1 = choice1 || choice2;
        if (choice1) {
            set["personality_traits"] = choice1;
        }
        if (choice2) {
            set["personality_traits"] += "\n\n" + choice2;
        }
        set["options-flag-personality"] = 0;
    }
    _.each(["ideal", "bond", "flaw"], function (type) {
        if (data["l1-background"].values["background_" + type + "_choice"]) {
            set[type + "s"] = data["l1-background"].values["background_" + type + "_choice"];
            set["options-flag-" + type + "s"] = 0;
        }
    });
    if (data["l1-background"].values["background_detail_choice"]) {
        set["background"] = removeExpansionInfo(_.last(data["l1-background"].values["background"].split(":"))) + " (" + data["l1-background"].values["background_detail_choice"] + ")";
    }
    allDrops = allDrops.concat(makeItemData(equipment));
    totalDrops += allDrops.length;
    _.each(allPageData, function (page) {
        allDrops = allDrops.concat(getOtherDrops(page.data));
    });

    //erase all repeating sections
    eraseRepeating(eraseSections, function () {
        setCharmancerText({ "mancer_progress": '<div style="width: 5%"></div>' });
        //first set is silent to prevent unwanted sheet workers
        setAttrs(silentset, { silent: true }, function () {
            setCharmancerText({ "mancer_progress": '<div style="width: 10%"></div>' });
            //reset remaining attributes, and set ability scores/custom info
            setAttrs(clearset, function () {
                setCharmancerText({ "mancer_progress": '<div style="width: 15%"></div>' });
                getAllPages(allDrops, function () {
                    setCharmancerText({ "mancer_progress": '<div style="width: 20%"></div>' });
                    doAllDrops(allPageData, function () {
                        console.log("DOING THE FINAL SET!!");
                        setAttrs(set, function () {
                            setCharmancerText({ "mancer_progress": '<div style="width: 100%"></div>' });
                            update_class();
                            organize_section_proficiencies();
                            update_skills(allSkills);
                            update_attacks("all");
                            var endTime = Date.now();
                            console.log("Elapsed time: ");
                            console.log((endTime - startTime) / 1000);
                            finishCharactermancer();
                        });
                    });
                });
            });
        });
    });
    /* */
});

/*********************************************************************/
/******                 LEVEL UP MANCER WORKERS                 ******/
/*********************************************************************/

//Helper function to update the text in the top bar
var recalcLpData = function (blobs) {
    var mancerdata = getCharmancerData();
    var abilities = getAbilityTotals(mancerdata, blobs);
    var update = {};
    _.each(abilityList, function (ability) {
        var selector = "attr-container .sheet-" + ability.toLowerCase() + "_total";
        update[selector] = abilities[ability.toLowerCase()] + " | " + abilities[ability.toLowerCase() + "_mod"];
    });
    update["hit_points"] = getHpTotal(mancerdata, blobs, abilities);
    setCharmancerText(update);
};
//Helper function to get ability totals, including asi
var getAbilityTotals = function (mancerdata, blobs) {
    mancerdata = mancerdata || getCharmancerData();
    blobs = blobs || getAllLpBlobs(mancerdata, true);
    var abilities = mancerdata["lp-welcome"].values["previous_abilities"] ? JSON.parse(mancerdata["lp-welcome"].values["previous_abilities"]) : {};
    var lcAbilities = abilityList.map(function (x) { return x.toLowerCase() });
    //Set previous scores first
    _.each(lcAbilities, function (ability) {
        abilities[ability + "_previous"] = abilities[ability];
        abilities[ability + "_previous_mod"] = abilities[ability + "_mod"];
        abilities[ability + "_maximum"] = abilities[ability + "_maximum"] ? parseInt(abilities[ability + "_maximum"]) : 20;
    });
    _.each(blobs.all, function (blob) {
        if (blob["Ability Score Increase"]) {
            var asi = JSON.parse(blob["Ability Score Increase"]);
            _.each(asi, function (increase, ability) {
                abilities[ability.toLowerCase()] += parseInt(increase);
            });
        }
        if (blob["Ability Score Max"]) {
            var max = JSON.parse(blob["Ability Score Max"]);
            _.each(max, function (increase, ability) {
                abilities[ability.toLowerCase() + "_maximum"] = parseInt(increase);
            });
        }
    })
    //Now add asi if it exists
    if (mancerdata["lp-asi"]) {
        _.each(mancerdata["lp-asi"].repeating, function (repid) {
            if (repid.substr(31) == "asi-row" && mancerdata["lp-asi"].values[repid + "_switch"] != "feat") {
                _.each(lcAbilities, function (ability) {
                    abilities[ability] += mancerdata["lp-asi"].values[repid + "_" + ability] ? parseInt(mancerdata["lp-asi"].values[repid + "_" + ability]) : 0;
                    abilities[ability + "_mod"] = Math.floor((abilities[ability] - 10) / 2);
                });
            }
        });
    }
    return abilities;
};
//Helper function to get hp total
var getHpTotal = function (mancerdata, blobs, abilities) {
    mancerdata = mancerdata || getCharmancerData();
    var leveldata = getLevelingData(mancerdata);
    var abilities = abilities || getAbilityTotals(mancerdata, blobs);
    var previous = mancerdata["lp-welcome"].values["previous_attributes"] ? JSON.parse(mancerdata["lp-welcome"].values["previous_attributes"]) : {};
    var prev_repeat = JSON.parse(mancerdata["lp-welcome"].values["previous_repeating"]), hpmod = prev_repeat["hpmod"];
    var newhp = 0;
    var additionalhp = 0;
    var totalpreviouslevel = parseInt(previous["base_level"]);
    for (var x = 1; x <= 3; x++) {
        if (previous["multiclass" + x + "_flag"] != "0") totalpreviouslevel += parseInt(previous["multiclass" + x + "_lvl"]);
    };

    //Calculate HP Mods things like Hill Dwarf
    let levelbonus = 0;
    _.each(hpmod, (mod) => {
        const bonus = mod["mod"];
        if (mod["levels"] === "total") {
            levelbonus += parseInt(bonus);
        };
    });

    //Add up the hp per level
    _.each(leveldata, function (level) {
        newhp += level.addhp > 0 ? level.addhp + (level.addlevel * abilities["constitution_mod"]) + (level.addlevel * levelbonus) : 0;
    });

    additionalhp = totalpreviouslevel * (abilities["constitution_mod"] - abilities["constitution_previous_mod"])
    return parseInt(previous["hp_max"]) + newhp + additionalhp;
};

var recalcButtons = function (mancerdata, thispage) {
    mancerdata = mancerdata || getCharmancerData();
    var buttons = "";
    var buttoninfo = {
        welcome: "charmancer-start",
        levels: "levels-u",
        choices: "features-u",
        asi: "asi-u",
        spells: "spells-u",
        summary: "review-u"
    };
    _.each(buttoninfo, function (translation, page) {
        let here = "lp-" + page == thispage;
        let disabled = false;
        if (thispage === "lp-spellchoice") disabled = true;
        if (!here && page !== "levels" && thispage === "lp-welcome") disabled = true;
        if (mancerdata["lp-levels"]) {
            if (!here && page === "asi" && mancerdata["lp-levels"].values.asi !== "true") disabled = true;
            if (!here && page === "spells" && mancerdata["lp-levels"].values.spells !== "true") disabled = true;
        } else {
            if (!here && (page === "asi" || page === "spells")) disabled = true;
        }
        buttons += "<li><button class=\"step" + (here ? " here" : "");
        if (disabled) buttons += " disabled";
        buttons += "\" type=\"" + (here ? "here" : "back") + "\" value=\"lp-" + page + "\" data-i18n=\"" + translation + "\"></button></li>";
    });
    buttons += "<li><button class=\"exit\" type=\"action\" name=\"act_cancel\" data-i18n=\"cancel-u\">CANCEL</button></li>";
    setCharmancerText({ steps: buttons });
}
//Worker for every page to add topbar/buttons
on("page:lp-welcome page:lp-levels page:lp-choices page:lp-asi page:lp-spells page:lp-summary page:lp-spellchoice", function (eventinfo) {
    var mancerdata = getCharmancerData();
    recalcButtons(mancerdata, eventinfo.triggerName);
    if (eventinfo.triggerName != "lp-welcome" && eventinfo.triggerName != "lp-summary") {
        addRepeatingSection("topbar-holder", "leveler-topbar");
        if (eventinfo.triggerName != "lp-choices" && eventinfo.triggerName != "lp-spells") recalcLpData();
        getProficiencies(mancerdata, eventinfo.currentStep);
    }
    getAttrs(["licensedsheet"], function (v) {
        if ("licensedsheet" in v && v.licensedsheet === "1") {
            setCharmancerText({ "sheet-licensedsheet-flag": "true" });
        }
    });
});

on("page:lp-welcome", function (eventinfo) {
    var getInfo = (sections, callback, results) => {
        results = results || {};
        if (sections.length > 0) {
            var section = sections.pop();
            getSectionIDs(section, function (ids) {
                results[section] = ids;
                getInfo(sections, callback, results);
            });
        } else {
            callback(results);
        }
    };
    var capitalize = function (string) {
        return string.split(" ").map((x) => {
            x = x.toLowerCase();
            return x[0].toUpperCase() + x.substr(1, x.length);
        }).join(" ");
    };
    var spellSections = ["spell-cantrip"];
    var allSkills = ["athletics", "acrobatics", "sleight_of_hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal_handling", "insight", "medicine", "perception", "survival", "deception", "intimidation", "performance", "persuasion"];
    var skillget = [];
    for (var x = 1; x <= 9; x++) {
        spellSections.push("spell-" + x);
    }

    getInfo(spellSections, function (results) {
        var getList = [];
        _.each(results, function (sectionids, sectionname) {
            _.each(sectionids, function (spellid) {
                getList.push("repeating_" + sectionname + "_" + spellid + "_spellname");
                getList.push("repeating_" + sectionname + "_" + spellid + "_spellclass");
                getList.push("repeating_" + sectionname + "_" + spellid + "_spelllevel");
                getList.push("repeating_" + sectionname + "_" + spellid + "_spellsource");
            });
        });
        getAttrs(getList, function (attrs) {
            var spellInfo = {};
            _.each(attrs, function (data, name) {
                var namearray = name.split("_");
                var thisattr = namearray.pop();
                var thisname = namearray.join("_");
                spellInfo[thisname] = spellInfo[thisname] || {};
                spellInfo[thisname][thisattr] = data;
            });
            setAttrs({ spellinfo: JSON.stringify(spellInfo) });
        });
    });
    getAttrs(["strength", "strength_mod", "dexterity", "dexterity_mod", "constitution", "constitution_mod", "intelligence", "intelligence_mod", "wisdom", "wisdom_mod", "charisma", "charisma_mod", "strength_maximum", "dexterity_maximum", "constitution_maximum", "intelligence_maximum", "wisdom_maximum", "charisma_maximum"], function (attrs) {
        _.each(attrs, function (x, y) {
            attrs[y] = parseInt(x);
        });
        setAttrs({ previous_abilities: JSON.stringify(attrs) });
    });
    getAttrs(["class", "subclass", "base_level", "multiclass1_flag", "multiclass2_flag", "multiclass3_flag", "multiclass1", "multiclass1_lvl", "multiclass1_subclass", "multiclass2", "multiclass2_lvl", "multiclass2_subclass", "multiclass3", "multiclass3_lvl", "multiclass3_subclass", "hp_max", "class_resource_name", "other_resource_name", "speed", "race", "subrace", "background", "custom_class", "cust_classname", "cust_hitdietype"], function (v) {
        let set = {};
        set["previous_attributes"] = JSON.stringify(v);
        set["lp-race"] = "Races:" + v.race;
        set["lp-subrace"] = "Subraces:" + v.subrace;
        set["lp-background"] = "Backgrounds:" + v.background.split("(")[0].trim();
        setAttrs(set);
    });
    _.each(allSkills, function (skill) {
        skillget.push(skill + "_prof");
        skillget.push(skill + "_type");
    });
    getAttrs(skillget, function (v) {
        var proficiencies = { "Weapon": [], "Armor": [], "Skill": [], "Tool": [], "Language": [], "Expertise": [] };
        _.each(allSkills, function (skill) {
            if (v[skill + "_prof"] !== "0") {
                proficiencies.Skill.push(capitalize(skill.replace(/_/g, " ")));
            }
            if (v[skill + "_type"] !== "1" && v[skill + "_prof"] !== "0") {
                proficiencies.Expertise.push(capitalize(skill.replace(/_/g, " ")));
            }
        });
        getSectionIDs("tool", function (ids) {
            var getList = [];
            _.each(ids, function (id) {
                getList.push("repeating_tool_" + id + "_toolname");
                getList.push("repeating_tool_" + id + "_toolbonus_base");
            });
            getAttrs(getList, function (v) {
                _.each(ids, function (id) {
                    proficiencies.Tool.push(v["repeating_tool_" + id + "_toolname"]);
                    if (v["repeating_tool_" + id + "_toolbonus_base"] == "(@{pb}*2)") {
                        proficiencies.Expertise.push(v["repeating_tool_" + id + "_toolname"]);
                    };
                });
                getSectionIDs("proficiencies", function (ids) {
                    var getList = [];
                    _.each(ids, function (id) {
                        getList.push("repeating_proficiencies_" + id + "_name");
                        getList.push("repeating_proficiencies_" + id + "_prof_type");
                    });
                    getAttrs(getList, function (v) {
                        _.each(ids, function (id) {
                            proficiencies[capitalize(v["repeating_proficiencies_" + id + "_prof_type"])].push(v["repeating_proficiencies_" + id + "_name"]);
                        });
                        setAttrs({ previous_proficiencies: JSON.stringify(proficiencies) });
                    });
                });
            });
        });
    });
    get_repeating_data(function (repeating) {
        console.log("REPEATING");
        console.log(repeating);
        setAttrs({ previous_repeating: JSON.stringify(repeating) });
    });
});

on("mancerchange:lp-race mancerchange:lp-subrace mancerchange:lp-background", function (eventinfo) {
    getCompendiumPage(eventinfo.newValue, function (results) { });
});

on("page:lp-levels", function (eventinfo) {
    const mancerdata = getCharmancerData();
    const previous = mancerdata["lp-welcome"].values["previous_attributes"] ? JSON.parse(mancerdata["lp-welcome"].values["previous_attributes"]) : {};
    let levelclass = ["class1"];
    let set = {};
    let update = {};
    let baseclass = previous["class"];
    let classcompend = ["Classes:"] + previous["class"];
    let custom_lock = 0;

    if (previous["custom_class"] && previous["custom_class"] == 1) {
        baseclass = previous["cust_classname"];
        classcompend = "Rules:Classes";
        custom_lock = 1;
        set["class1_addlevel"] = 0;
    };

    set["lockcustomclass"] = custom_lock;
    set["class1"] = 'Classes:' + baseclass;
    set["class1_currentlevel"] = previous["base_level"];
    update["class1_selector"] = '<span class="sheet-compendium-class-name">' + baseclass + '</span>';
    if (previous["subclass"] && previous["custom_class"] === "0") {
        update[`subclass1_selector`] = `<div>` + previous["subclass"] + `</div>`;
        if ((mancerdata["lp-levels"] && mancerdata["lp-levels"].values["class1_subclass"] !== "Subclasses" + previous["subclass"])
            || !mancerdata["lp-levels"]) set["class1_subclass"] = "Subclasses:" + previous["subclass"];
    };
    const multiclass = parseInt(previous["multiclass1_flag"]) + parseInt(previous["multiclass2_flag"]) + parseInt(previous["multiclass3_flag"]);
    set["multiclass"] = mancerdata["lp-levels"] && mancerdata["lp-levels"].values["multiclass"] ? mancerdata["lp-levels"].values["multiclass"] : multiclass;
    set["multiclass_initial"] = multiclass;

    for (x = 1; x <= 3; x++) {
        const x1 = x + 1;
        if (previous[`multiclass${x}_flag`] === "1") {
            set[`class${x1}`] = "Classes:" + previous[`multiclass${x}`];
            set[`class${x1}_currentlevel`] = previous[`multiclass${x}_lvl`];
            update[`class${x1}_selector`] = `<span class="sheet-compendium-class-name">${previous[`multiclass${x}`]}</span>`;
            if (previous[`multiclass${x}_subclass`]) {
                set[`class${x1}_subclass`] = "Subclasses:" + previous[`multiclass${x}_subclass`];
                update[`subclass${x1}_selector`] = `<div>` + previous[`multiclass${x}_subclass`] + `</div>`;
            };
            levelclass.push(`class${x1}`);
        } else {
            set[`class${x1}_currentlevel`] = 0;
        };

        //This is handling classes that have been multiclassed into while in the leveler
        if (mancerdata["lp-levels"] && mancerdata["lp-levels"].values[`class${x1}`] && parseInt(mancerdata["lp-levels"].values[`class${x1}_addlevel`]) > 0 && !levelclass.includes(`class${x1}`)) {
            levelclass.push(`class${x1}`);
        };
    };

    setAttrs(set, () => { update_hp(true, levelclass) });
    setCharmancerText(update);

    changeCompendiumPage("sheet-levels-info", classcompend);
});

on("mancerchange:class1 mancerchange:class2 mancerchange:class3 mancerchange:class4", function (eventinfo) {
    if (eventinfo.sourceType !== "worker") deleteCharmancerData(["lp-choices", "lp-asi", "lp-spells", "lp-summary"]);
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"];
    const levelclass = eventinfo.sourceAttribute;
    const previous = mancerdata["lp-welcome"].values["previous_attributes"] ? JSON.parse(mancerdata["lp-welcome"].values["previous_attributes"]) : {};

    getCompendiumPage(eventinfo.newValue, function (p) {
        p = removeDuplicatedPageData(p);
        const data = p.data;
        const class_name = eventinfo.newValue && eventinfo.newValue.split(":").length > 1 && eventinfo.newValue.split(":")[0] === "Classes" ? eventinfo.newValue.split(":")[1] : false;
        const subclass_name = data["Subclass Name"];
        let set = {};
        let update = {};

        if (levelclass === "class1" && (!previous["custom_class"] || previous["custom_class"] == 0)) {
            set[`${levelclass}_addlevel`] = leveldata.values[`${levelclass}_addlevel`] ? leveldata.values[`${levelclass}_addlevel`] : 1;
        } else {
            set[`${levelclass}_addlevel`] = leveldata.values[`${levelclass}_addlevel`] ? leveldata.values[`${levelclass}_addlevel`] : 0;
        };

        set[`${levelclass}_hitdie`] = data["Hit Die"];
        update[`sub${levelclass}_name`] = `<h4>${subclass_name}</h4>`;

        //Need to add a check here if a previous subclass value exists, skip this part if so.
        if (class_name) {
            var subOptions = { show_source: true };
            let reset = {};
            reset[levelclass + "_subclass"] = "<option value=\"\" data-i18n=\"choose\">Choose</option>";
            //setCharmancerText(reset)

            (eventinfo.sourceType != "player") ? subOptions.silent = true : subOptions.selected = "";

            setCharmancerOptions(levelclass + "_subclass", "Category:Subclasses data-Parent:" + class_name, subOptions, function (values) {
            });
        };

        const presets = [leveldata.values.class1, leveldata.values.class2, leveldata.values.class3, leveldata.values.class4];
        for (x = 2; x <= 4; x++) {
            disableCharmancerOptions(`class${x}`, presets);
        };

        setCharmancerText(update);
        setAttrs(set, function () {
            let set = {};
            set[eventinfo.sourceAttribute] = eventinfo.newValue;
            setAttrs(set, { silent: true });
        });
    });
});

//Trigger a change event when subclass changes
["class1", "class2", "class3", "class4"].forEach(levelclass => {
    on(`mancerchange:${levelclass}_subclass`, (eventinfo) => {
        const mancerdata = getCharmancerData();
        const leveldata = mancerdata["lp-levels"].values;
        const repeating = mancerdata["lp-levels"].repeating || [];
        let set = {};

        if (eventinfo.sourceType !== "worker") deleteCharmancerData(["lp-choices", "lp-asi", "lp-spells", "lp-summary"]);
        getCompendiumPage(eventinfo.newValue, function (data) {
            data = removeDuplicatedPageData(data);
            updateClassLevel(undefined, eventinfo.sourceAttribute.slice(0, 6));
        });

        //This will update the results inputs with new hp values if the subclass is Draconic
        if (eventinfo.sourceType !== "worker") {
            const newValue = (eventinfo.newValue) ? eventinfo.newValue : " ";
            const previousValue = (eventinfo.previousValue) ? eventinfo.previousValue : " ";
            let repids = [], updateArray = [];
            _.each(repeating, (repid) => {
                if (repid.includes(`_${levelclass}-`)) { updateArray.push(repid); };
            });
            _.each(updateArray, (repid) => {
                if (newValue.includes("Draconic Bloodline") || previousValue.includes("Draconic Bloodline")) { repids.push(repid); };
            });

            if (repids.length > 0) {
                updateButtons(levelclass, repids);
                updateResults(levelclass, repids, eventinfo);
            };
        };

        setAttrs(set);
    });
});

on("mancerchange:class1_addlevel mancerchange:class2_addlevel mancerchange:class3_addlevel mancerchange:class4_addlevel", function (eventinfo) {
    if (eventinfo.sourceType !== "worker") deleteCharmancerData(["lp-choices", "lp-asi", "lp-spells", "lp-summary"]);
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"];
    const levelclass = eventinfo.sourceAttribute.slice(0, 6);
    const classlevel = (parseInt(eventinfo.newValue) || 0) + (parseInt(leveldata.values[`${levelclass}_currentlevel`]) || 0);
    const subclasslevel = (leveldata.data[`${levelclass}`] && leveldata.data[`${levelclass}`]["data-Subclass Level"]) ? parseInt(leveldata.data[`${levelclass}`]["data-Subclass Level"]) : 3;
    let set = {};
    let update = {};
    if (eventinfo.currentStep === "lp-levels") updateClassLevel(mancerdata, levelclass);

    set[`${levelclass}_classlevel`] = classlevel;
    if (classlevel >= subclasslevel) {
        update[`sub${levelclass}_warning`] = ``;
        showChoices([`sub${levelclass}`]);
    } else {
        update[`sub${levelclass}_warning`] = `<p>Subclass chosen at level ${subclasslevel}. Your total level is ${classlevel}.</p>`;
        hideChoices([`sub${levelclass}`]);
    };

    const level = (leveldata.values[`${levelclass}_currentlevel`] === undefined) ? 0 : leveldata.values[`${levelclass}_currentlevel`];
    update[`${levelclass}_update`] = `level ${level} + `;
    update[`${levelclass}_tot`] = `= level ${classlevel}`;

    setCharmancerText(update);
    setAttrs(set);
});

const updateClassLevel = function (mancerdata, levelclass) {
    mancerdata = mancerdata || getCharmancerData();
    const leveling = getLevelingData(mancerdata);
    const blobs = getAllLpBlobs(mancerdata, true);
    const spells = getNewSpells(mancerdata, leveling, blobs);
    let set = {};
    let update = {};
    let asi = false;

    for (let x = 0; x <= 4; x++) {
        update["class" + x + "_features"] = "";
        update["subclass" + x + "_features"] = "";
    }

    _.each(leveling, function (thislevel) {
        _.each(["", "sub"], function (prefix) {
            let thiskey = "class" + thislevel.classnumber;
            let final = [];
            if (prefix === "sub") thiskey += "_subclass";
            _.each(blobs.names[thiskey], function (blobname) {
                if (blobname.substr(0, 30) == "Ability Score Increase - Level") {
                    asi = true;
                    final.push("Ability Score Increase");
                } else if ((thislevel[prefix + "class"].blobs[blobname].Title || thislevel[prefix + "class"].blobs[blobname].Description || thislevel[prefix + "class"].blobs[blobname].Traits) && !thislevel[prefix + "class"].blobs[blobname].Group) {
                    final.push(thislevel[prefix + "class"].blobs[blobname].Title || blobname);
                }
            });
            update[prefix + "class" + thislevel.classnumber + "_features"] = _.uniq(final).join(", ");
        });
    });

    set.asi = asi.toString();
    set.spells = spells.toString();

    setCharmancerText(update);
    setAttrs(set, () => {
        update_hp(false, [`${levelclass}`]);
        recalcButtons(undefined, "lp-levels");
    });
};

//Build a function to update the level & class each time they change
on("mancerchange:class1_classlevel mancerchange:class2_classlevel mancerchange:class3_classlevel mancerchange:class4_classlevel", function (eventinfo) {
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"];
    const class1levels = parseInt(leveldata.values["class1_classlevel"]) || 0, class2levels = parseInt(leveldata.values["class2_classlevel"]) || 0, class3levels = parseInt(leveldata.values["class3_classlevel"]) || 0, class4levels = parseInt(leveldata.values["class4_classlevel"]) || 0;
    const characterlevel = class1levels + class2levels + class3levels + class4levels;
    let update = {};
    let set = {};
    let end = [];

    for (x = 1; x <= 4; x++) {
        let name = (leveldata.values[`class${x}`]) ? leveldata.values[`class${x}`].slice(8) : "";
        let lvl = parseInt(leveldata.values[`class${x}_classlevel`]) || 0;
        (lvl > 0 && x === 1) ? end.push(`${name} ${lvl}`) : (lvl > 0 && x > 1) ? end.push(` ${name} ${lvl}`) : false;
    };

    update["levels_message"] = `<p>Character will be level ${characterlevel} (${end})</p>`;
    set[`characterlevel`] = characterlevel;

    setAttrs(set);
    setCharmancerText(update);
});

const recalcHpByLevel = (section) => {
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"].values;
    const repeating = mancerdata["lp-levels"].repeating || [];
    let set = {};
    const sections = section ? [section] : ["class1", "class2", "class3", "class4"];

    _.each(sections, (levelclass) => {
        let thishp = 0;
        let first = true;
        let rollflag = "";
        _.each(repeating, function (repid) {
            if (repid.split("_")[2].split("-")[0] == levelclass && leveldata[`${repid}_result`]) {
                let thisflag = leveldata[`${repid}_rollflag`] || "average";
                thishp += parseInt(leveldata[`${repid}_result`]);
                if (first) {
                    rollflag = thisflag;
                    first = false;
                }
                if (rollflag !== thisflag) rollflag = "none";
            }
        });
        set[`${levelclass}_hp_flag`] = rollflag;
        set[`${levelclass}_addhp`] = thishp;
    });
    setAttrs(set, () => { recalcLpData() });
};

const update_hp = (firstTime, levelclass) => {
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"].values;
    const repeating = mancerdata["lp-levels"].repeating || [];

    const updateByLevel = (firstTime, levelclass) => {
        _.each(levelclass, (levelclass) => {
            const current = leveldata[`${levelclass}_currentlevel`] ? parseInt(leveldata[`${levelclass}_currentlevel`]) : 0,
                addlevel = leveldata[`${levelclass}_addlevel`] ? parseInt(leveldata[`${levelclass}_addlevel`]) : 0;
            let levelarray = [], addarray = [], removearray = [], existing = [];

            for (let x = current + 1; x <= current + addlevel; x++) {
                levelarray.push(`${levelclass}-${x}`);
            }
            addarray = levelarray;
            if (!firstTime) {
                _.each(repeating, function (id) {
                    addarray = _.without(addarray, id.split("_")[2]);
                });
            }
            _.each(repeating, function (id) {
                if (id.split("_")[2].split("-")[0] == levelclass && !levelarray.includes(id.split("_")[2]) && !existing.includes(id.split("_")[2])) {
                    removearray.push(id);
                    existing.push(id.split("_")[2]);
                };
            });

            if (addarray.length > 0) {
                const last = addarray[addarray.length - 2];
                let set = {}, update = {}, rowid = "", repids = [];
                _.each(repeating, (repid) => {
                    if (repid.split("_")[2] == `${levelclass}hprow`) rowid = repid;
                });
                _.each(addarray, (repname) => {
                    addRepeatingSection(rowid, "hpbylevel", repname, function (repid) {
                        repids.push(repid);
                        if (repid.includes(last) || addarray.length == 1) {
                            updateResults(levelclass, repids);
                            updateButtons(levelclass, repids);
                        };
                        update[`${repid} label`] = `Level ${_.last(repname.split("-"))}`;
                        if (repname == _.last(addarray)) {
                            setCharmancerText(update);
                            setAttrs(set, () => {
                                clearRepeatingSectionById(removearray, () => {
                                    recalcHpByLevel(levelclass);
                                });
                            });
                        }
                    });
                });
            } else {
                clearRepeatingSectionById(removearray, () => {
                    recalcHpByLevel(levelclass);
                });
            };
        });
    };

    if (firstTime) {
        addRepeatingSection("class1_by-levels", "row", "class1hprow", function () {
            addRepeatingSection("class2_by-levels", "row", "class2hprow", function () {
                addRepeatingSection("class3_by-levels", "row", "class3hprow", function () {
                    addRepeatingSection("class4_by-levels", "row", "class4hprow", function () {
                        updateByLevel(true, levelclass);
                    });
                });
            });
        });
    } else {
        updateByLevel(false, levelclass);
    };
};

const updateButtons = (levelclass, repids) => {
    getAttrs(["licensedsheet"], function (v) {
        const mancerdata = getCharmancerData();
        const leveldata = mancerdata["lp-levels"].values;
        const addlevel = leveldata[`${levelclass}_addlevel`] ? parseInt(leveldata[`${levelclass}_addlevel`]) : 0;
        const hitdie = leveldata[`${levelclass}_hitdie`];
        let average = getDieAvg(hitdie), set = {}, bonus = hpBonus(levelclass), hpbonus = bonus[0], bonusSource = bonus[1];
        const templateBonus = (hpbonus > 0) ? `+${hpbonus}[${bonusSource}]` : "";
        const licensedsheet = (v.licensedsheet && v.licensedsheet === "1") ? "licensedsheet" : "";

        _.each(repids, (repid) => {
            set[`roll_${repid}_rollhp`] = `@{wtype}&{template:mancerhproll} {{title=Roll for HP Level ${_.last(repid.split(`${levelclass}-`))}}} {{r1=[[1${hitdie}${templateBonus}]]}}  {{licensedsheet=${licensedsheet}}}`;
            set[`roll_${repid}_averagehp`] = `@{wtype}&{template:mancerhproll} {{title=Average for HP Level ${_.last(repid.split(`${levelclass}-`))}}} {{a1=[[${average}${templateBonus}]]}}  {{licensedsheet=${licensedsheet}}}`;

            if (addlevel && hitdie) {
                let dice = [];
                //Set the roll buttons
                for (x = 1; x <= addlevel; x++) { dice.push(`{{r${x}=[[1${hitdie}${templateBonus}]]}}`); };
                set[`roll_${levelclass}_rollhp`] = `@{wtype}&{template:mancerhproll} {{title=Roll for HP}} ` + dice.join()

                //Set the average hp button
                set[`roll_${levelclass}_averagehp`] = `@{wtype}&{template:mancerhproll} {{title=Average for HP}}{{a1=[[${average}${templateBonus}]]}} {{licensedsheet=${licensedsheet}}}`
            };
        });

        setAttrs(set);
    });
};

const hpBonus = (levelclass) => {
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"].values;

    //HP Bonus from subclass hp mods like Draconic Bloodline for Sorcerers
    const prev_repeat = JSON.parse(mancerdata["lp-welcome"].values["previous_repeating"]), hpmod = prev_repeat["hpmod"], subclass = leveldata[`${levelclass}_subclass`];;
    let hpbonus = 0, bonusSource = [];
    _.each(hpmod, (mod) => {
        if (mod["levels"] === "base" && subclass && subclass.includes(mod["source"])) {
            bonusSource.push(mod["source"]);
            hpbonus += parseInt(mod["mod"]);
        };
    });

    //Multiclassing into Sorcerer Draconic needs to update buttons
    if (subclass && subclass.includes("Draconic Bloodline") && !bonusSource.includes("Draconic Bloodline")) {
        bonusSource.push("Draconic Bloodline");
        hpbonus += parseInt(1);
    };

    return [hpbonus, bonusSource];
};

const updateResults = (levelclass, repids, eventinfo) => {
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"].values;
    const hitdie = leveldata[`${levelclass}_hitdie`];
    let average = getDieAvg(hitdie), bonus = hpBonus(levelclass), hpbonus = bonus[0], set = {};

    _.each(repids, (repid) => {
        console.log(repid);
        if (!leveldata[`${repid}_result`]) {
            set[`${repid}_result`] = parseInt(average) + parseInt(hpbonus);
        } else if (eventinfo && (eventinfo.newValue).includes("Draconic Bloodline")) {
            set[`${repid}_result`] = parseInt(leveldata[`${repid}_result`]) + parseInt(hpbonus);
        } else if (eventinfo && (eventinfo.previousValue).includes("Draconic Bloodline")) {
            set[`${repid}_result`] = parseInt(leveldata[`${repid}_result`]) - 1;
        } else {
            false
        };
    });

    setAttrs(set);
};

const getDieAvg = (hitdie) => {
    if (!hitdie) return 0;
    const size = hitdie.slice(1);
    let num = [], sum = 0;

    //Push an array of numbers
    for (x = 1; x <= size; x++) { num.push(x); };

    //Add up the nummbers above
    for (i = 0; i < num.length; i++) { sum += num[i]; };

    return Math.ceil(sum / num.length);
};

//Roll & Average buttons inside the repeating hp section for each level
["class1", "class2", "class3", "class4"].forEach(levelclass => {
    on(`mancerroll:repeating_${levelclass}hprow`, (eventinfo) => {
        const source = eventinfo.sourceAttribute, flag = source.includes("rollhp") ? "roll" : "average";
        let set = {};

        set[`${eventinfo.sourceSection}_result`] = eventinfo.roll[0].result;
        set[`${eventinfo.sourceSection}_rollflag`] = flag;
        setAttrs(set, () => { recalcHpByLevel() })
    });
});

//Roll & Average top level buttons for each class
["class1", "class2", "class3", "class4"].forEach(levelclass => {
    on(`mancerroll:${levelclass}_rollhp mancerroll:${levelclass}_averagehp`, (eventinfo) => {
        const mancerdata = getCharmancerData();
        const leveldata = mancerdata["lp-levels"].values;
        const repeating = mancerdata["lp-levels"].repeating || [];
        const source = eventinfo.sourceAttribute, flag = source.includes("rollhp") ? "roll" : "average";
        let set = {}, sum = 0, rows = "", num = 0;

        repeating.forEach(row => {
            if (row.includes(`${levelclass}-`) && source.includes("rollhp")) {
                set[row + "_result"] = eventinfo.roll[`${num}`].result;
                set[row + "_rollflag"] = flag;
                num += 1;
            } else if (row.includes(`${levelclass}-`) && source.includes("average")) {
                set[row + "_result"] = eventinfo.roll[0].result;
                set[row + "_rollflag"] = flag;
            } else {
                false
            };
        });

        //Add up the results for rollhp or multiply the average option by added levels
        if (source.includes("rollhp")) {
            _.each(eventinfo.roll, function (roll) {
                sum += parseInt(roll.result);
            });
        } else {
            sum = parseInt(eventinfo.roll[0].result) * leveldata[`${levelclass}_addlevel`];
        };

        // Set addhp to the total
        set[`${levelclass}_addhp`] = sum;

        //Set hp_flag to be roll or average so the CSS will highlight the appropriate button
        set[`${levelclass}_hp_flag`] = flag;

        setAttrs(set, function () { recalcLpData(); });
    });
});

on("clicked:multiclass_add clicked:multiclass_remove", function (eventinfo) {
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"];
    const levelclass = "class" + (parseInt(leveldata.values["multiclass"]) + 1);
    const repeating = mancerdata["lp-levels"].repeating || [];
    let set = {};
    let update = {};

    if (eventinfo.sourceAttribute === "multiclass_add") {
        (leveldata.values["multiclass"] < 3) ? set["multiclass"] = parseInt(leveldata.values["multiclass"]) + 1 : false;
        update["add_multiclass"] = `<button type="action" name="act_multiclass_add" disabled>+</button>`;
        //set[`${levelclass}_addlevel`] = 1;
    } else {
        if (leveldata.values["multiclass"] > leveldata.values["multiclass_initial"]) {
            const multiclass = parseInt(leveldata.values["multiclass"]);
            let rows = "";

            set["multiclass"] = multiclass - 1;
            update["add_multiclass"] = `<button type="action" name="act_multiclass_add">+</button>`;

            repeating.forEach(row => {
                if (row.includes(`${levelclass}-`)) {
                    set[row + "_result"] = "";
                };
            });

            set[`${levelclass}_addhp`] = 0;
            set[`${levelclass}_hp_flag`] = "";
        } else {
            false
        };
    };

    setAttrs(set, function () { recalcLpData(); });
    setCharmancerText(update);
});

on("mancerchange:class1_addhp mancerchange:class2_addhp mancerchange:class3_addhp mancerchange:class4_addhp", function (eventinfo) {
    if (eventinfo.sourceType === "player") {
        const mancerdata = getCharmancerData(), levelclass = eventinfo.sourceAttribute.slice(0, 6);
        const repeating = mancerdata["lp-levels"].repeating || [];
        let set = {};

        repeating.forEach(row => {
            if (row.includes(`${levelclass}-`)) {
                set[row + "_result"] = "";
            };
        });

        set[`${levelclass}_hp_flag`] = "";

        setAttrs(set);
    };
});

on("mancerchange:multiclass", function () {
    const mancerdata = getCharmancerData();
    const leveldata = mancerdata["lp-levels"];
    const tot = isNaN(parseInt(leveldata.values["multiclass"])) ? 1 : parseInt(leveldata.values["multiclass"]) + 1;
    let update = {};
    let presets = [];

    for (var x = 1; x <= tot - 1; x++) {
        if (leveldata.values["class" + x]) presets.push(_.last(leveldata.values["class" + x].split(":")))
    }
    setCharmancerOptions("class" + tot, "Category:Classes", { disable: presets, category: "Classes" });
    update["multiclass_message"] = `<h3>Multiclass (${tot}/4)</h3>`;
    setCharmancerText(update);
});

on("clicked:class1 clicked:class2 clicked:class3 clicked:class4 clicked:class1_subclass clicked:class2_subclass clicked:class3_subclass clicked:class4_subclass", function (eventinfo) {
    const mancerdata = getCharmancerData();
    const source = eventinfo.sourceAttribute;
    const page = mancerdata["lp-levels"].values[`${source}`];

    changeCompendiumPage("sheet-levels-info", page);
    getCompendiumPage(page, function (p) {
    });
});

var getLevelingData = function (mancerdata) {
    mancerdata = mancerdata || getCharmancerData();
    var leveling = [];
    if (!mancerdata["lp-levels"]) return leveling;
    var multiclass = mancerdata["lp-levels"].values.multiclass ? parseInt(mancerdata["lp-levels"].values.multiclass) : 0;
    for (var x = 1; x <= multiclass + 1; x++) {
        if (mancerdata["lp-levels"].data["class" + x] && mancerdata["lp-levels"].values["class" + x + "_addlevel"] && mancerdata["lp-levels"].values["class" + x + "_addlevel"] != "0") {
            var thisclass = {};
            var maxspell = 0;
            thisclass.class = mancerdata["lp-levels"].data["class" + x];
            thisclass.subclass = mancerdata["lp-levels"].data["class" + x + "_subclass"] || {};
            thisclass.classname = _.last(mancerdata["lp-levels"].values["class" + x].split(":"));
            thisclass.subclassname = mancerdata["lp-levels"].values["class" + x + "_subclass"] ? _.last(mancerdata["lp-levels"].values["class" + x + "_subclass"].split(":")) : "";
            thisclass.currentlevel = mancerdata["lp-levels"].values["class" + x + "_currentlevel"] ? parseInt(mancerdata["lp-levels"].values["class" + x + "_currentlevel"]) : 0;
            thisclass.addlevel = parseInt(mancerdata["lp-levels"].values["class" + x + "_addlevel"]);
            thisclass.addhp = mancerdata["lp-levels"].values["class" + x + "_addhp"] ? parseInt(mancerdata["lp-levels"].values["class" + x + "_addhp"]) : 0;
            thisclass.classnumber = x;
            if (thisclass.subclass["Spellcasting Ability"]) {
                thisclass.spellcasting = thisclass.subclass["Spellcasting Ability"];
            } else if (thisclass.class["Spellcasting Ability"]) {
                thisclass.spellcasting = thisclass.class["Spellcasting Ability"];
            }
            _.each(thisclass.class.blobs, function (blob) {
                if (blob["Spell Slots"] && parseInt(blob.Level) <= (thisclass.currentlevel + thisclass.addlevel)) {
                    _.each(JSON.parse(blob["Spell Slots"]), function (slots, name) {
                        if (parseInt(_.last(name.split(" "))) > maxspell) maxspell = parseInt(_.last(name.split(" ")));
                    });
                }
            });
            thisclass.maxspell = maxspell;
            leveling.push(thisclass);
        }
    }
    return leveling;
};

var getLpRaceData = function (mancerdata, leveldata) {
    mancerdata = mancerdata || getCharmancerData();
    leveldata = leveldata || getLevelingData(mancerdata);
    let results = {};
    let currentlevel = 0;
    let addlevel = 0;
    _.each(leveldata, function (level) {
        addlevel += level.addlevel;
        currentlevel += level.currentlevel;
    });
    currentlevel = currentlevel === 0 ? 1 : currentlevel;
    _.each(["race", "background"], function (section) {
        results[section] = { addlevel: addlevel, currentlevel: currentlevel };
        results[section][section] = mancerdata["lp-welcome"].data["lp-" + section] || {};
        results[section]["sub" + section] = mancerdata["lp-welcome"].data["lp-sub" + section] || {};
        results[section].type = section;
        results[section].name = _.last(mancerdata["lp-welcome"].values["lp-" + section].split(":")) || "";
        results[section].name += mancerdata["lp-welcome"].values["lp-sub" + section] ? " - " + _.last(mancerdata["lp-welcome"].values["lp-sub" + section].split(":")) : "";
    });
    return results;
};

var getLpBlobs = function (data, include_asi, verbose) {
    const type = data.type || "class";
    var asi = type == "class" ? data[type]["data-Ability Score Levels"] : [];
    var allblobs = {};
    allblobs[type] = {};
    allblobs["sub" + type] = {};
    _.times(data.addlevel, function (x) {
        var thislevel = data.currentlevel + x + 1;
        allblobs[type] = _.extend(allblobs[type], filterBlobs(data[type].blobs, { "Level": "" + thislevel, multiclass: true }));
        allblobs["sub" + type] = _.extend(allblobs["sub" + type], filterBlobs(data["sub" + type].blobs, { "Level": "" + thislevel, multiclass: true }));
        if (asi.includes("" + thislevel) && include_asi) {
            allblobs[type]["Ability Score Increase - Level " + thislevel] = { Level: thislevel, parentSection: type };
            data[type].blobs["Ability Score Increase - Level " + thislevel] = {
                Level: thislevel,
                Title: ("Ability Score Increase - Level " + thislevel)
            };
        }
    });
    allblobs[type] = _.extend(allblobs[type], filterBlobs(data[type].blobs, { "Level": "every", multiclass: true }));
    allblobs["sub" + type] = _.extend(allblobs["sub" + type], filterBlobs(data["sub" + type].blobs, { "Level": "every", multiclass: true }));
    var remove = {};
    remove[type] = [];
    remove["sub" + type] = [];
    //Figure out which blobs are just the same feature at a different level, add them to a list to remove (unless we're useing the verbose option)
    if (!verbose) {
        _.each(allblobs, function (blobs, section) {
            _.each(blobs, function (blob, name) {
                var basename = name.split("(")[0];
                blob.Level = parseInt(blob.Level);
                if (basename.trim().toLowerCase() == "spell slots") {
                    remove[section].push(name);
                } else if (basename.trim().toLowerCase() != "proficiencies") {
                    _.each(allblobs, function (otherblobs, othersection) {
                        _.each(otherblobs, function (otherblob, othername) {
                            if (name != othername && basename == othername.split("(")[0]) {
                                if (blob.Level > parseInt(otherblob.Level)) {
                                    remove[section].push(othername);
                                } else {
                                    remove[section].push(name);
                                }
                            }
                        })
                    });
                }
            });
        });
    }
    //remove any blobs that are the same feature
    _.each(remove, function (removeArray, section) {
        _.each(_.uniq(removeArray), function (thisblob) {
            delete allblobs[section][thisblob];
        });
    });
    //here we build the final list of blobs that will be added
    var filteredblobs = {};
    filteredblobs[type] = [];
    filteredblobs["sub" + type] = [];
    _.each(allblobs, function (blobs, section) {
        _.each(blobs, function (blob, name) {
            var thisblob = {
                Level: blob.Level,
                name: name
            };
            filteredblobs[section].push(thisblob);
        });
    });
    _.each(filteredblobs, function (bloblist) {
        bloblist = _.sortBy(bloblist, "Level");
    })
    filteredblobs.allblobs = _.extend(data[type].blobs, data["sub" + type].blobs);
    return filteredblobs;
};

var getAllLpBlobs = function (mancerdata, include_asi) {
    const pickBlobs = function (theseblobs, allblobs, key, section) {
        blobs.names[key] = _.pluck(theseblobs, "name") || [];
        if (mancerdata["lp-choices"]) {
            _.each(mancerdata["lp-choices"].values, function (value, id) {
                if ((value + "").split(":")[0] == "Blob" && id.split("_")[2].split("--")[0] == section) {
                    blobs.names[key].push(value.split(":")[1]);
                };
            });
        };
        _.each(blobs.names[key], function (blobname) {
            _.each(filterBlobs(allblobs, { "name": blobname, multiclass: true }), function (blob, blobname) {
                blobs.all.push(blob);
                blobs.sorted[key] = blobs.sorted[key] ? blobs.sorted[key] : [];
                blobs.sorted[key].push(blob);
            });
        });
    };
    mancerdata = mancerdata || getCharmancerData();
    const leveldata = getLevelingData(mancerdata);
    const racedata = getLpRaceData(mancerdata, leveldata);
    var blobs = { all: [], sorted: {}, names: {} };
    _.each(leveldata, function (level) {
        var name = "class" + level.classnumber;
        var theseblobs = getLpBlobs(level, include_asi, true);
        pickBlobs(theseblobs.class, level.class.blobs, name, "class-" + level.classnumber);
        if (level.subclass) {
            pickBlobs(theseblobs.subclass, level.subclass.blobs, name + "_subclass", "subclass-" + level.classnumber);
        };
    });
    _.each(racedata, function (level) {
        var name = level.type;
        var theseblobs = getLpBlobs(level, include_asi, true);
        pickBlobs(theseblobs[name], level[name].blobs, name, name);
        if (level["sub" + name]) {
            pickBlobs(theseblobs["sub" + name], level["sub" + name].blobs, "sub" + name, "sub" + name);
        };
    });
    return blobs;
};

on("page:lp-choices", function (eventinfo) {
    const resortBlobs = function (blobs, section) {
        _.each(blobs[section], function (x) { x.parentSection = section });
        _.each(blobs["sub" + section], function (x) { x.parentSection = "sub" + section });
        let filteredblobs = _.sortBy(blobs[section].concat(blobs["sub" + section]), "Level");
        let resorted = [];
        _.each(filteredblobs, function (blob) {
            if (blob.name.split(" ")[0] == "Proficiencies") {
                resorted.unshift(blob);
            } else {
                resorted.push(blob);
            }
        });
        return resorted;
    }
    const mancerdata = getCharmancerData();
    const leveling = getLevelingData(mancerdata);
    const racedata = getLpRaceData(mancerdata, leveling);
    _.each(racedata, function (data, section) {
        const blobs = getLpBlobs(data, true);
        const relevant = resortBlobs(blobs, section);
        if (relevant.length > 0) {
            addRepeatingSection("choices", "row", function (thisrow) {
                let update = {};
                update[thisrow] = "<h2>" + removeExpansionInfo(data.name) + "<span>";
                update[thisrow] += data.addlevel > 1 ? " Levels " + (data.currentlevel + 1) + " - " + (data.currentlevel + data.addlevel) : " Level " + (data.currentlevel + 1);
                update[thisrow] += "</span></h2>";
                setCharmancerText(update);
                _.each(relevant, function (blob, y) {
                    handleBlobs(blobs.allblobs, {
                        filters: { multiclass: true },
                        slide: "lp-choices",
                        section: blob.parentSection + "--" + blob.Level,
                        element: thisrow,
                        thisblob: blob.name,
                        maxlevel: data.currentlevel + data.addlevel,
                        parent: section
                    });
                    if (y === (relevant.length - 1)) {
                        recalcLpData();
                    }
                });
            });
        };
    });
    _.each(leveling, function (data) {
        var x = data.classnumber;
        var blobs = getLpBlobs(data, true);
        addRepeatingSection("choices", "row", function (classrow) {
            var classname = data.subclassname ? removeExpansionInfo(data.subclassname) + " " + removeExpansionInfo(data.classname) : removeExpansionInfo(data.classname);
            var update = {};
            update[classrow] = "<h2>" + classname + "<span>";
            update[classrow] += data.addlevel > 1 ? " Levels " + (data.currentlevel + 1) + " - " + (data.currentlevel + data.addlevel) : " Level " + (data.currentlevel + 1);
            update[classrow] += "</span></h2>";
            setCharmancerText(update);
            resorted = resortBlobs(blobs, "class");
            _.each(resorted, function (blob, y) {
                handleBlobs(blobs.allblobs, {
                    filters: { multiclass: true },
                    slide: "lp-choices",
                    section: blob.parentSection + "-" + x + "--" + blob.Level,
                    element: classrow,
                    thisblob: blob.name,
                    maxlevel: data.currentlevel + data.addlevel,
                    parent: "class" + data.classnumber + (blob.parentSection === "class" ? "" : "_subclass")
                });
                if (y === (resorted.length - 1)) {
                    recalcLpData();
                }
            });
        });
    });
    if (leveling[0] && leveling[0].classname) {
        changeCompendiumPage("sheet-class-info", "Classes:" + leveling[0].classname);
    }
});

on("page:lp-asi", function (eventinfo) {
    var mancerdata = getCharmancerData();
    var leveling = getLevelingData(mancerdata);
    var asis = [];
    var update = {};
    var multiclass = mancerdata["lp-levels"].values.multiclass ? parseInt(mancerdata["lp-levels"].values.multiclass) : 0;
    for (var x = 1; x <= multiclass + 1; x++) {
        if (mancerdata["lp-levels"].data["class" + x]) {
            var thisclass = {};
            thisclass.class = mancerdata["lp-levels"].data["class" + x];
            thisclass.classname = _.last(mancerdata["lp-levels"].values["class" + x].split(":"));
            thisclass.currentlevel = parseInt(mancerdata["lp-levels"].values["class" + x + "_currentlevel"]);
            thisclass.addlevel = parseInt(mancerdata["lp-levels"].values["class" + x + "_addlevel"]);
            leveling["class" + x] = thisclass;
        }
    }
    _.each(leveling, function (data) {
        var asi = data.class["data-Ability Score Levels"];
        _.times(data.addlevel, function (x) {
            var thislevel = data.currentlevel + x + 1;
            if (asi.includes("" + thislevel)) {
                asis.push(data.classname + " Level " + thislevel);
            }
        });
    });
    _.each(asis, function (asi) {
        addRepeatingSection("choices", "asi-row", function (rowid) {
            update[rowid + " .sheet-title"] = "Ability Score Increase: " + removeExpansionInfo(asi);
            setCharmancerOptions(rowid + "_feat", "Category:Feats");
            updateAbilityLock(rowid);
            if (asi == _.last(asis)) {
                setCharmancerText(update);
            }
        })
    })
});

var getKnownLpSpells = function (mancerdata) {
    mancerdata = mancerdata || getCharmancerData();
    var leveldata = getLevelingData(mancerdata);
    var previousspells = mancerdata["lp-welcome"].values["spellinfo"] ? JSON.parse(mancerdata["lp-welcome"].values["spellinfo"]) : {};
    var spelldata = {};
    var totallevel = 0;
    var prevtotallevel = 0;
    _.each(previousspells, function (spell) {
        spelldata[spell.spellname] = { level: spell.spelllevel };
        if (spell.spellclass) spelldata[spell.spellname].spellclass = spell.spellclass;
        if (spell.spellclass && spell.spellclass.toLowerCase() == "racial") spelldata[spell.spellname].known = "Racial";
        if (spell.spellsource) spelldata[spell.spellname].known = spell.spellsource;
    });
    _.each(leveldata, function (level) {
        totallevel += level.currentlevel + level.addlevel;
        prevtotallevel += level.currentlevel;
    });
    //Gather known spells
    _.each(mancerdata, function (page, pagename) {
        if (pagename.split("-")[0] == "lp") {
            let choices = [];
            let choicepage = ["lp-welcome", "lp-levels"].includes(pagename) ? (mancerdata["lp-choices"] ? mancerdata["lp-choices"].values : []) : page.values;
            _.each(choicepage, function (val) {
                if ((val + "").split(":")[0] === "Blob") choices.push(val.split(":")[1]);
            });
            _.each(page.data, function (data, dataname) {
                var thislevel = 0;
                var prevlevel = 0;
                var thisclass = {};
                if (dataname.substring(0, 5) == "class") {
                    thisclass = _.findWhere(leveldata, { classnumber: parseInt(dataname[5]) });
                    thislevel = thisclass ? thisclass.currentlevel + thisclass.addlevel : 0;
                    prevlevel = 0;
                } else {
                    thislevel = totallevel;
                    prevlevel = prevtotallevel;
                }
                _.each(data.blobs, function (blob, blobname) {
                    if (blob.Multiclass != "no" && ((parseInt(blob.Level) <= thislevel || blob.Level == "all") && !blob.Group) || choices.includes(blobname)) {
                        if (blob.Spells) {
                            var blobspells = JSON.parse(blob.Spells);
                            _.each(blobspells, function (blobspell) {
                                if (blobspell.Known) {
                                    _.each(blobspell.Known, function (spell) {
                                        spelldata[spell] = spelldata[spell] || { level: blobspell.Level };
                                        spelldata[spell].known = blobspell.Source || data.Category.substring(0, data.Category.length - 2);
                                        spelldata[spell].spellclass = thisclass.classname;
                                        if (dataname.substring(0, 5) != "class") {
                                            spelldata[spell].known = data.Category.substring(0, data.Category.length - 1);
                                            spelldata[spell].spellclass = data.Category == "Races" ? "Racial" : data.Category.substring(0, data.Category.length - 1);
                                        }
                                        if (blobspell.Ability) {
                                            spelldata[spell].ability = blobspell.Ability;
                                        } else if (thisclass.class && thisclass.class["Spellcasting Ability"]) {
                                            spelldata[spell].ability = thisclass.class["Spellcasting Ability"];
                                        } else if (thisclass.subclass && thisclass.subclass["Spellcasting Ability"]) {
                                            spelldata[spell].ability = thisclass.subclass["Spellcasting Ability"];
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            });
            //Gater spells from class features
            _.each(page.values, function (value, name) {
                if (name.substr(-18) === "_utilityrow_spells") {
                    console.log("UTILITYROW SPELLS!");
                    console.log(JSON.parse(value));
                    spelldata = _.extend(spelldata, JSON.parse(value));
                }
            });
        }
    });
    /**/
    return spelldata;
};

var getNewSpells = function (mancerdata, leveldata, blobs) {
    mancerdata = mancerdata || getCharmancerData();
    leveldata = leveldata || getCharmancerData();
    blobs = blobs || getAllLpBlobs(mancerdata, false);
    var result = false;
    _.each(leveldata, function (level) {
        var prevlevel = level.currentlevel;
        var thislevel = level.addlevel + prevlevel;
        var thisclass = { class: level.classname, number: level.classnumber, newlevel: thislevel, additional: [] };
        var prevknown = 0;
        var currentknown = 0;
        var prevcantrips = 0;
        var currentcantrips = 0;
        var spelladd = 0;
        thisclass.newspells = 0;
        _.each(["class", "subclass"], function (section) {
            if (level[section]) {
                _.each(level[section].blobs, function (blob) {
                    if (blob.Level == thislevel) {
                        if (blob["Spells Known"]) {
                            currentknown = parseInt(blob["Spells Known"]);
                            if (level.class["data-Spell Replace"]) result = true;
                        }
                        if (blob.Cantrips) {
                            thisclass.cantrips = true;
                            currentcantrips = parseInt(blob.Cantrips);
                        }
                        if (blob["Spells Prepared"]) {
                            result = true;
                        }
                    }
                    if (blob.Level == prevlevel || (prevlevel === 0 && blob.Level == 1)) {
                        if (blob["Spells Known"]) {
                            prevknown = prevlevel === 0 ? 0 : parseInt(blob["Spells Known"]);
                            if (prevlevel === 0) thisclass.newspells = parseInt(blob["Spells Known"]);
                        }
                        if (blob.Cantrips) {
                            thisclass.cantrips = true;
                            prevcantrips = prevlevel === 0 ? 0 : parseInt(blob.Cantrips);
                        }
                    }
                    if (level[section]["data-Spell Add"]) {
                        spelladd = parseInt(level[section]["data-Spell Add"]);
                    }
                });
            }
        });
        if (spelladd) {
            thisclass.newspells += prevlevel === 0 ? spelladd * (thislevel - prevlevel - 1) : spelladd * (thislevel - prevlevel);
        } else {
            thisclass.newspells = currentknown - prevknown;
        }
        thisclass.newcantrips = currentcantrips - prevcantrips;
        _.each(["", "_subclass"], function (section) {
            if (blobs.sorted[`class${level.classnumber}${section}`]) {
                _.each(blobs.sorted[`class${level.classnumber}${section}`], function (blob) {
                    if (blob.Spells) {
                        let spells = JSON.parse(blob.Spells);
                        _.each(spells, function (spell) {
                            if (spell.Choose) {
                                result = true;
                            }
                        });
                    }
                });
            }
        });
        if (thisclass.newcantrips || thisclass.newspells) result = true;
    });
    return result;
};

on("page:lp-spells", function (eventinfo) {
    var mancerdata = getCharmancerData();
    var queries = [];
    var blobs = getAllLpBlobs(mancerdata, false);
    var leveldata = getLevelingData(mancerdata);
    var classes = [];
    var knowncantrips = 0;
    var knownspells = 0;
    var newcantrips = 0;
    var newspells = 0;
    var replace = 0;
    var totallevel = 0;
    var spellmaxlevel = 0;
    var prepared = true;
    var prevspells = mancerdata["lp-welcome"].values["spellinfo"] ? JSON.parse(mancerdata["lp-welcome"].values["spellinfo"]) : {};
    var spelldata = getKnownLpSpells(mancerdata);
    var abilities = getAbilityTotals(mancerdata, blobs);
    _.each(spelldata, function (spell, spellname) {
        if (spell.level == "cantrip") {
            knowncantrips++;
        } else {
            knownspells++;
        }
    });
    recalcLpData(blobs);
    //Gather spell data about each class
    _.each(leveldata, function (level) {
        var prevlevel = level.currentlevel;
        var thislevel = level.addlevel + prevlevel;
        var thisclass = { class: level.classname, number: level.classnumber, newlevel: thislevel, additional: [] };
        var toSwap = level.class["data-Spell Replace"] ? parseInt(level.class["data-Spell Replace"]) : 0;
        var prevknown = 0;
        var currentknown = 0;
        var prevcantrips = 0;
        var currentcantrips = 0;
        var spelladd = 0;
        thisclass.list = [thisclass.class];
        totallevel += thislevel;
        thisclass.newspells = 0;
        _.each(["class", "subclass"], function (section) {
            if (level[section]) {
                if (level[section]["data-Spell List"]) thisclass.list = [level[section]["data-Spell List"]];
                if (level[section]["Spellcasting Ability"]) thisclass.ability = level[section]["Spellcasting Ability"];
                _.each(level[section].blobs, function (blob) {
                    if (blob.Level == thislevel) {
                        if (blob["Spell Slots"]) {
                            var slots = JSON.parse(blob["Spell Slots"]);
                            thisclass.maxlevel = JSON.parse(_.last(_.last(_.keys(slots).sort()).split(" ")));
                            spellmaxlevel = Math.max(thisclass.maxlevel, spellmaxlevel);
                        }
                        if (blob["Spells Known"]) {
                            currentknown = parseInt(blob["Spells Known"]);
                        }
                        if (blob.Cantrips) {
                            thisclass.cantrips = true;
                            currentcantrips = parseInt(blob.Cantrips);
                        }
                        if (blob["Spells Prepared"]) {
                            var splitted = blob["Spells Prepared"].split("+").map((x) => { return x.trim() });
                            thisclass.prepared = 0;
                            _.each(splitted, function (term, x) {
                                if (isNaN(parseInt(term))) {
                                    thisclass.prepared += abilities[term.toLowerCase() + "_mod"] ? abilities[term.toLowerCase() + "_mod"] : 0;
                                } else {
                                    thisclass.prepared += parseInt(term);
                                }
                            });
                            thisclass.prepared = Math.max(thisclass.prepared, 1);
                        }
                    }
                    if (blob.Level == prevlevel || (prevlevel === 0 && blob.Level == 1)) {
                        if (blob["Spells Known"]) {
                            prevknown = prevlevel === 0 ? 0 : parseInt(blob["Spells Known"]);
                            if (prevlevel === 0) thisclass.newspells = parseInt(blob["Spells Known"]);
                        }
                        if (blob.Cantrips) {
                            thisclass.cantrips = true;
                            prevcantrips = prevlevel === 0 ? 0 : parseInt(blob.Cantrips);
                            if (knowncantrips < prevcantrips) prevcantrips = knowncantrips;
                        }
                    }
                    if (blob.Level == "every" || blob.Level == thislevel) {
                        if (blob["Additional Spell List"]) thisclass.list.push(blob["Additional Spell List"]);
                    }
                    if (level[section]["data-Spell Add"]) {
                        spelladd = parseInt(level[section]["data-Spell Add"]);
                    }
                });
            }
        });
        if (spelladd) {
            thisclass.newspells += prevlevel === 0 ? spelladd * (thislevel - prevlevel - 1) : spelladd * (thislevel - prevlevel);
        } else {
            thisclass.newspells = currentknown - prevknown;
        }
        if (thisclass.prepared) thisclass.newspells = thisclass.prepared;
        thisclass.newcantrips = currentcantrips - prevcantrips;
        thisclass.replace = toSwap * (thislevel - prevlevel);
        _.each(["", "_subclass"], function (section) {
            if (blobs.sorted[`class${level.classnumber}${section}`]) {
                _.each(blobs.sorted[`class${level.classnumber}${section}`], function (blob) {
                    if (blob.Spells) {
                        let spells = JSON.parse(blob.Spells);
                        _.each(spells, function (spell) {
                            if (spell.Choose && spell.Level === "0") {
                                thisclass.newcantrips += parseInt(spell.Choose);
                            }
                        });
                    }
                });
            }
        });
        if (thisclass.newcantrips || thisclass.newspells) classes.push(thisclass);
    });
    if (classes.length > 0) {
        var existinglist = _.pluck(prevspells, "spellname");
        var knownlist = _.keys(spelldata);
        //Look through all the data to see if there's any expanded lists
        _.each(mancerdata, function (page, pagename) {
            if (pagename.split("-")[0] == "lp") {
                _.each(page.data, function (data, dataname) {
                    var thislevel = 0;
                    if (dataname.substring(0, 5) == "class") {
                        var thisclass = _.findWhere(leveldata, { classnumber: parseInt(dataname[5]) });
                        thislevel = thisclass ? thisclass.currentlevel + thisclass.addlevel : 0;
                    } else {
                        thislevel = totallevel;
                    }
                    _.each(data.blobs, function (blob, blobname) {
                        if ((parseInt(blob.Level) <= thislevel || blob.Level == "every") && blob.Multiclass != "no") {
                            if (blob.Spells) {
                                var blobspells = JSON.parse(blob.Spells);
                                _.each(blobspells, function (thisspell) {
                                    if (parseInt(thisspell.Level) <= spellmaxlevel) {
                                        if (thisspell["Expanded List"]) {
                                            knownlist = knownlist.concat(thisspell["Expanded List"]);
                                        }
                                    }
                                });
                            }
                        }
                    });
                })
            }
        });
        if (knownlist) {
            queries.push("Category:Spells Name:" + knownlist.join("|"));
        }
        _.each(classes, function (thisclass) {
            if (thisclass.maxlevel || thisclass.newcantrips) {
                newcantrips += thisclass.newcantrips || 0;
                newspells += thisclass.newspells;
                replace += thisclass.replace;
                if (!thisclass.prepared) prepared = false;
                thisquery = "Category:Spells Classes:*" + _.uniq(thisclass.list).join("|*") + " Level:";
                if (thisclass.cantrips) thisquery += "0|"
                for (var x = 1; x <= thisclass.maxlevel; x++) {
                    thisquery += x;
                    if (x != thisclass.maxlevel) thisquery += "|";
                }
                _.each(thisclass.additional, function (lvl) {
                    thisquery += "|" + lvl;
                });
                queries.push(thisquery);
            }
        });
        var toSet = {};
        toSet.knowncantrips = knowncantrips;
        toSet.knownspells = knownspells;
        toSet.newcantrips = newcantrips;
        toSet.newspells = newspells;
        toSet.replace = replace;
        setAttrs(toSet);
        var update = {};
        update["spells-summary"] = "";
        if (newcantrips != 0 || knowncantrips != 0) update["spells-summary"] = "<div class=\"level_0\"><div class=\"title\">Cantrips: </div><div class=\"list\"></div></div>";
        _.times(spellmaxlevel, function (x) {
            update["spells-summary"] += "<div class=\"level_" + (x + 1) + "\"><div class=\"title\">Level " + (x + 1) + ": </div><div class=\"list\"></div></div>";
        });
        if (classes.length > 1) {
            update["cantripinfo"] = "";
            _.each(classes, function (thisclass) {
                if (thisclass.newspells) {
                    update["cantripinfo"] += "<p>You can add " + thisclass.newcantrips + " " + thisclass.class + " cantrips.</p>";
                }
            });
        }
        setCharmancerText(update);
        getCompendiumQuery(queries, (data) => {
            data = removeDuplicatedPageData(data);
            let byLevel = {};
            _.each(data, (spell) => {
                let classes = [];
                if (spell.data.Classes) {
                    classes = spell.data.Classes;
                    //Ravinca introduced Spells without Classes
                } else {
                    ["class1", "class2", "class3", "class4"].forEach(levelclass => {
                        //Get the class name out of values & confirm its a spellcaster using data Spellcasting Ability
                        const name = (mancerdata["lp-levels"].values[`${levelclass}`]) ? mancerdata["lp-levels"].values[`${levelclass}`].split("Classes:")[1] : false;
                        const ability =
                            //Check if the class has a Spellcasting Ability attribute
                            (mancerdata["lp-levels"].data[`${levelclass}`] && mancerdata["lp-levels"].data[`${levelclass}`]["Spellcasting Ability"]) ? true :
                                //Check if the subclass has a Spellcasting Ability attribute
                                (mancerdata["lp-levels"].data[`${levelclass}_subclass`] && mancerdata["lp-levels"].data[`${levelclass}_subclass`]["Spellcasting Ability"]) ? true :
                                    //Set to false if the class is not a spellcaster
                                    false;
                        if (name && ability) {
                            //Spell casters have thier class name pushed to the array above
                            classes.push(name);
                        };
                    });

                    if (classes.length > 0) {
                        classes = classes.join(', ');
                    };
                };

                /* This will set the information for populating the spell list */
                if (classes.length > 0) {
                    byLevel[spell.data.Level] = byLevel[spell.data.Level] || [];
                    byLevel[spell.data.Level].push({
                        name: spell.name,
                        classes: classes.split(",").map(x => x.trim()),
                        level: parseInt(spell.data.Level)
                    });
                };
            });
            addSpellSections(byLevel, {
                newspells: newspells,
                newcantrips: newcantrips,
                replace: replace,
                prepared: prepared,
                classes: classes,
                spelldata: spelldata,
                existinglist: existinglist
            });
        });
    }
});

const addSpellSections = function (byLevel, settings) {
    settings = settings || {};
    let newspells = settings.newspells || 0;
    let newcantrips = settings.newcantrips || 0;
    let replace = settings.replace || 0;
    let prepared = settings.prepared || false;
    let classes = settings.classes || [];
    let spelldata = settings.spelldata || [];
    let existinglist = settings.existinglist || [];
    let spellnumber = 0;
    //D&D 5e Lvl+ Mancer: Spells tab "Level undefined" (UC605)
    //When invoking Lvl+ from an incomplete manually levelled character, an undefined lv is generated due to missing information.
    //This code prevents an incomplete list from being displayed.
    //By Miguel
    if ('undefined' in byLevel) {
        delete byLevel.undefined;
    }
    _.each(byLevel, function (level) {
        spellnumber += level.length;
    });
    byLevel["0"] = byLevel["0"] || [];
    addRepeatingSection("choices", "row", "spellsrow", function (spellsrow) {
        let toSet = {};
        let update = {};
        _.each(byLevel, function (spells, x) {
            addRepeatingSection(spellsrow, "spell-holder", "spell-holder-" + x, function (levelrow) {
                if (x == "0") {
                    if (newspells > 0) {
                        if (classes.length > 1) {
                            update[levelrow + " .sheet-spellstext .sheet-summary"] = "";
                            _.each(classes, function (thisclass) {
                                if (thisclass.newspells) {
                                    update[levelrow + " .sheet-spellstext .sheet-summary"] += "<p>You can add " + thisclass.newspells + " " + thisclass.class + " spells.</p>";
                                }
                            });
                        } else {
                            update[levelrow + " .sheet-spellstext .sheet-summary"] = "<p>You can add " + newspells + " new spells.</p>";
                        }
                    }
                    if (replace > 0) {
                        if (classes.length > 1) {
                            update[levelrow + " .sheet-replacetext .sheet-summary"] = "";
                            _.each(classes, function (thisclass) {
                                if (thisclass.replace) {
                                    update[levelrow + " .sheet-replacetext .sheet-summary"] += "<p>You can replace " + thisclass.replace + " " + thisclass.class + " spells.</p>";
                                }
                            });
                        } else {
                            update[levelrow + " .sheet-replacetext .sheet-summary"] = "<p>You can replace " + replace + " spells.</p>";
                        }
                        showChoices([levelrow + " .sheet-replace-info"]);
                    }
                } else {
                    update[levelrow + " .sheet-spellinfo"] = "";
                }
                update[levelrow + " label .sheet-title"] = x == "0" ? "Cantrips" : "Level " + x;
                update[levelrow + " label .sheet-title"] += "<span class=\"choice\">r</span>"
                if (x == "0" && newcantrips == 0) {
                    toSet[levelrow + "_show"] = "1";
                    update[levelrow + " .sheet-controller"] = "1";
                }
                if (spells.length === 0) hideChoices([levelrow + " label"]);
                spells = _.sortBy(spells, "name");
                setCharmancerText(update);
                _.each(spells, function (spell) {
                    addRepeatingSection(levelrow + " .sheet-container", "spell-item", function (spellid) {
                        var update = {};
                        toSet[spellid + "_name"] = spell.name;
                        toSet[spellid + "_level"] = x;
                        update[spellid + " .sheet-name"] = spell.name;
                        update[spellid + " .sheet-classes"] = "";
                        if (x == "0" && newcantrips == 0) update[spellid + " .sheet-hardlock"] = "locked";
                        var spellclasses = [];
                        _.each(classes, function (thisclass, y) {
                            if (spell.classes.includes(thisclass.list) && spell.level <= thisclass.maxlevel) {
                                spellclasses.push({ class: thisclass.class, ability: thisclass.ability });
                                if (classes.length > 1) {
                                    update[spellid + " .sheet-classes"] += "<span class=\"class" + y + "\">" + thisclass.class + "</span>";
                                }
                            }
                        });
                        if (spellclasses.length == 1 || classes.length == 1) {
                            toSet[spellid + "_class"] = spellclasses[0] ? spellclasses[0].class : classes[0].class;
                            toSet[spellid + "_ability"] = spellclasses[0] ? spellclasses[0].ability : classes[0].ability;
                        }
                        _.each(spelldata, function (thisspell, spellname) {
                            if (spellname == spell.name) {
                                toSet[spellid + "_checked"] = "1";
                                if (!prepared || x == "0") {
                                    toSet[spellid + "_existing"] = "1";
                                    if (x == "0" || replace == 0) update[spellid + " .sheet-hardlock"] = "locked";
                                }
                                if (thisspell.known) {
                                    toSet[spellid + "_checked"] = "1";
                                    toSet[spellid + "_existing"] = "1";
                                    toSet[spellid + "_source"] = thisspell.known;
                                    update[spellid + " .sheet-classes"] = "<span class=\"known\">" + thisspell.known + " Spell</span>";
                                    update[spellid + " .sheet-hardlock"] = "locked";
                                }
                                if (thisspell.spellclass) toSet[spellid + "_class"] = thisspell.spellclass;
                                if (thisspell.ability) toSet[spellid + "_ability"] = thisspell.ability;
                            }
                        });
                        if (settings.selected && settings.selected.includes(spell.name)) {
                            toSet[spellid + "_checked"] = "1";
                        }
                        if (settings.locked && settings.locked.includes(spell.name)) {
                            toSet[spellid + "_checked"] = "1";
                            toSet[spellid + "_existing"] = "1";
                            update[spellid + " .sheet-hardlock"] = "locked";
                        }
                        spellnumber--;
                        setCharmancerText(update);
                        if (spellnumber <= 0) {
                            setAttrs(toSet, { silent: true }, function () {
                                updateSpellSummary("all", undefined, settings.page);
                            });
                        }
                    });
                });
            });
        });
    });
};

const updateSpellSummary = function (sourcelevel, data, thispage) {
    var mancerdata = data || getCharmancerData();
    var spellpage = thispage ? mancerdata[thispage] : mancerdata["lp-spells"];
    var replist = spellpage.repeating || [];
    var cantripsection = replist.find((x) => { return x.includes("_spell-holder-0") });
    var update = {};
    var sections = [];
    var perlevel = {};
    var allowed = 0;
    var allowedreplace = 0;
    //first, list spells you already know
    _.each(replist, function (repid) {
        if (spellpage.values[repid + "_existing"]) {
            var selector = "spells-summary .sheet-level_" + spellpage.values[repid + "_level"] + " .sheet-list";
            update[selector] = update[selector] || "";
            update[selector] += spellpage.values[repid + "_checked"] ? "<span>" : "<span class=\"removed\">";
            update[selector] += spellpage.values[repid + "_name"] + "</span>";
        }
    });
    //then, list new spells you've checked
    _.each(replist, function (repid) {
        if (spellpage.values[repid + "_checked"] && !spellpage.values[repid + "_existing"]) {
            var selector = "spells-summary .sheet-level_" + spellpage.values[repid + "_level"] + " .sheet-list";
            update[selector] = update[selector] || "";
            update[selector] += "<span class=\"new\">" + spellpage.values[repid + "_name"] + "</span>";
        }
    });
    if (sourcelevel == "0") {
        sections.push(cantripsection);
        allowed = spellpage.values.newcantrips || 0;
    } else {
        update[cantripsection + " .sheet-spellstext .sheet-levels"] = "";
        for (var x = 1; x <= 9; x++) {
            var thissection = replist.find((y) => { return y.includes("_spell-holder-" + x) });
            allowed = spellpage.values.newspells;
            allowedreplace = spellpage.values.replace;
            if (thissection) {
                perlevel[x + ""] = { number: 0, section: thissection, replaced: false };
                sections.push(thissection);
            }
        }
    }
    getRepeatingSections(replist.find((x) => { return x.includes("spellsrow") }), function (repeating) {
        var toSet = {};
        var spellids = [];
        var newspells = 0;
        var replaced = 0;
        _.each(repeating.tree, function (spells, levelrow) {
            if (sections.includes(levelrow)) {
                spellids = spellids.concat(_.keys(spells));
            }
        });
        _.each(spellids, function (id) {
            if (spellpage.values[id + "_checked"] && !spellpage.values[id + "_existing"]) {
                newspells++;
                if (perlevel[spellpage.values[id + "_level"]]) perlevel[spellpage.values[id + "_level"]].number++;
            }
            if (!spellpage.values[id + "_checked"] && spellpage.values[id + "_existing"]) {
                replaced++;
                if (perlevel[spellpage.values[id + "_level"]]) perlevel[spellpage.values[id + "_level"]].replaced = true;
            }
        });
        //now lock/unlock spells depending on if we've selected as many as we're allowed
        _.each(spellids, function (id) {
            if (!spellpage.values[id + "_checked"]) {
                update[id + " .sheet-lock"] = newspells >= (allowed + replaced) ? "locked" : "";
            } else if (spellpage.values[id + "_checked"] && spellpage.values[id + "_existing"]) {
                update[id + " .sheet-lock"] = allowedreplace <= replaced ? "locked" : "";
            }
        });
        if (sourcelevel == "0") {
            var known = (thispage != "lp-spellchoice" && spellpage.values.knowncantrips) ? spellpage.values.knowncantrips : 0;
            update[cantripsection + " label .sheet-number"] = (known + newspells) + " / " + (known + allowed);
        } else {
            if (thispage != "lp-spellchoice") {
                update[cantripsection + " .sheet-spellstext .sheet-total"] = newspells + " / " + (allowed + replaced) + " spells chosen.";
                if (replaced > 0) {
                    update[cantripsection + " .sheet-spellstext .sheet-total"] += "<br>(" + allowed + " new, " + replaced + " replaced)";
                }
                if (allowedreplace > 0) {
                    update[cantripsection + " .sheet-replacetext .sheet-total"] = replaced + " / " + allowedreplace + " spells replaced.";
                }
            }
            _.each(perlevel, function (info, level) {
                if (thispage != "lp-spellchoice") update[cantripsection + " .sheet-spellstext .sheet-levels"] += "<p>" + info.number + " Level " + level + " spells added.</p>";
                update[info.section + " label .sheet-number"] = "";
                if (info.number > 0) update[info.section + " label .sheet-number"] = "+" + info.number;
                if (info.replaced) {
                    showChoices([info.section + " .sheet-spellheader .sheet-title span"]);
                } else {
                    hideChoices([info.section + " .sheet-spellheader .sheet-title span"]);
                }
            });
        }
        setCharmancerText(update);
        if (sourcelevel == "all") updateSpellSummary("0", mancerdata, thispage);
        setCharmancerText({ pagelock: "unlock" })
    });
};

on("clicked:repeating_spell-item", function (eventinfo) {
    if (eventinfo.sourceAttribute.indexOf("spell-item_info") === -1) return;
    var mancerdata = getCharmancerData();
    changeCompendiumPage("sheet-spells-info", "Spells:" + mancerdata[eventinfo.currentStep].values[eventinfo.sourceSection + "_name"], "card_only");
});

on("mancerchange:repeating_spellsrow", function (eventinfo) {
    var mancerdata = getCharmancerData();
    if (eventinfo.sourceAttribute && _.last(eventinfo.sourceAttribute.split("_")) == "show") {
        var update = {};
        update[eventinfo.sourceSection + " .sheet-controller"] = eventinfo.newValue || "";
        setCharmancerText(update);
    } else {
        updateSpellSummary(mancerdata[eventinfo.currentStep].values[eventinfo.sourceSection + "_level"], mancerdata, eventinfo.currentStep);
    }
});

on("mancerchange:repeating_asi-row", function (eventinfo) {
    var trigger = eventinfo.sourceAttribute.substr(39);
    if (trigger == "switch") {
        var update = {};
        update[eventinfo.sourceSection + " .sheet-switch"] = eventinfo.newValue == "feat" ? "feat" : "";
        setCharmancerText(update);
    } else if (trigger == "feat") {

    } else {
        updateAbilityLock(eventinfo.sourceSection);
        //This will lock other ASI when leveling up multiple levels at once
        //By Miguel
        var repeatingData = getCharmancerData()['lp-asi'].repeating || [];
        for (data in repeatingData) {
            if (repeatingData[data].indexOf('_asi-row') > -1) {
                updateAbilityLock(repeatingData[data]);
            }
        }
    }
    recalcLpData();
});

on("clicked:repeating_asi-row", function (eventinfo) {
    var mancerdata = getCharmancerData();
    var thischange = eventinfo.sourceAttribute.substr(0, eventinfo.sourceAttribute.length - 2);
    var currentvalue = mancerdata["lp-asi"].values[thischange] ? parseInt(mancerdata["lp-asi"].values[thischange]) : 0;
    var totalincrease = 0;
    var update = {};
    var lockinfo = {};
    _.each(abilityList, function (ability) {
        var thisincrease = mancerdata["lp-asi"].values[eventinfo.sourceSection + "_" + ability.toLowerCase()] || 0;
        totalincrease += parseInt(thisincrease);
    });
    if (_.last(eventinfo.sourceAttribute) == "u" && totalincrease < 2 && currentvalue < 2) {
        update[thischange] = currentvalue + 1;
        mancerdata["lp-asi"].values[thischange] = currentvalue + 1;
    } else if (_.last(eventinfo.sourceAttribute) == "d" && currentvalue > 0) {
        update[thischange] = currentvalue - 1;
        mancerdata["lp-asi"].values[thischange] = currentvalue - 1;
    }
    setAttrs(update, function () {
        recalcLpData();
    });
});

var updateAbilityLock = function (sourceSection, mancerdata) {
    mancerdata = mancerdata || getCharmancerData();
    var abilities = getAbilityTotals(mancerdata);
    var totalincrease = 0;
    var update = {};
    //First, get the total increase for this section
    _.each(abilityList, function (ability) {
        var thisincrease = mancerdata["lp-asi"].values[sourceSection + "_" + ability.toLowerCase()] || 0;
        totalincrease += parseInt(thisincrease);
    });
    //Then, figure out what to lock (based on increase)
    _.each(abilityList, function (ability) {
        var thisincrease = mancerdata["lp-asi"].values[sourceSection + "_" + ability.toLowerCase()] || 0;
        update[sourceSection + " .sheet-" + ability.toLowerCase() + "_lock-down"] = thisincrease > 0 ? "" : "lock";
        update[sourceSection + " .sheet-" + ability.toLowerCase() + "_lock-up"] = thisincrease < 2 && totalincrease < 2 ? "" : "lock";
    });
    //Now, figure out if any stats are maxed out
    _.each(abilityList, function (ability) {
        if (abilities[ability.toLowerCase()] >= abilities[ability.toLowerCase() + "_maximum"]) {
            update[sourceSection + " .sheet-" + ability.toLowerCase() + "_lock-up"] = "lock";
        };
    });
    setCharmancerText(update);
};

on("page:lp-summary", function () {
    var mancerdata = getCharmancerData();
    var abilities = getAbilityTotals(mancerdata);
    var previous = mancerdata["lp-welcome"].values["previous_attributes"] ? JSON.parse(mancerdata["lp-welcome"].values["previous_attributes"]) : {};
    var spelldata = mancerdata["lp-welcome"].values["spellinfo"] ? JSON.parse(mancerdata["lp-welcome"].values["spellinfo"]) : {};
    var lcAbilities = abilityList.map(function (x) { return x.toLowerCase() });
    var update = {};
    update["before div"] = "<div class=\"row\"><p>Class: <span>";
    if (previous.subclass) update["before div"] += previous.subclass + " ";
    update["before div"] += previous.class + " " + previous.base_level;
    for (var x = 1; x <= 3; x++) {
        if (previous["multiclass" + x + "_flag"] != "0") {
            update["before div"] += ", " + previous["multiclass" + x] + " " + previous["multiclass" + x + "_lvl"];
        }
    };
    update["before div"] += "</span></p>";
    update["before div"] += "<p>Hit Points: <span>" + previous.hp_max + "</span></p></div>";
    update["before div"] += "<div class=\"row\"><div class=\"ability-row\">";
    _.each(lcAbilities, function (ability) {
        update["before div"] += "<div><h5 data-i18n=\"" + ability.substr(0, 3) + "-u\"></h5>";
        update["before div"] += "<span class=\"score\">" + abilities[ability + "_previous"] + "</span> ";
        update["before div"] += "(<span class=\"mod\">";
        update["before div"] += abilities[ability + "_previous_mod"] >= 0 ? "+" + abilities[ability + "_previous_mod"] : abilities[ability + "_previous_mod"];
        update["before div"] += "</span>)</div>";
    });
    update["before div"] += "</div></div><div class=\"row\"></div>";
    update["after div"] = "<div class=\"row\"><p class=\"highlight\">Class: <span>";
    for (var x = 1; x <= 4; x++) {
        if (mancerdata["lp-levels"].values["class" + x]) {
            if (x !== 1) update["after div"] += ", "
            if (mancerdata["lp-levels"].values["class" + x + "_subclass"]) {
                if ((x == 1 && !previous.subclass) || (x != 1 && previous["multiclass" + x + "_flag"] != "0" && !previous["multiclass" + x + "_subclass"])) {
                    update["after div"] += "<span class=\"highlight\">";
                } else {
                    update["after div"] += "<span>";
                }
                update["after div"] += removeExpansionInfo(mancerdata["lp-levels"].values["class" + x + "_subclass"].split(":")[1]) + " </span>";
            }
            if (x != 1 && previous["multiclass" + x + "_flag"] != "0" && !previous["multiclass" + x + "_subclass"]) {
                update["after div"] += "<span class=\"highlight\">";
            } else {
                update["after div"] += "<span>";
            }
            update["after div"] += removeExpansionInfo(mancerdata["lp-levels"].values["class" + x].split(":")[1]) + " </span>";
            if (mancerdata["lp-levels"].values["class" + x + "_addlevel"]) {
                update["after div"] += "<span class=\"highlight\">";
            } else {
                update["after div"] += "<span>";
            }
            var prevlevel = 0;
            if (x == 1) {
                prevlevel = parseInt(previous["base_level"]);
            } else {
                prevlevel = previous["multiclass" + x + "_flag"] == "0" ? 0 : parseInt(previous["multiclass" + x + "_lvl"])
            }
            update["after div"] += (prevlevel + parseInt(mancerdata["lp-levels"].values["class" + x + "_addlevel"])) + " </span>";
        }
    };
    update["after div"] += "</span></p>";
    update["after div"] += "<p class=\"highlight\">Hit Points: <span class=\"highlight\">" + getHpTotal(mancerdata) + "</span></p></div>";
    update["after div"] += "<div class=\"row\"><div class=\"ability-row\">";
    _.each(lcAbilities, function (ability) {
        update["after div"] += abilities[ability] == abilities[ability + "_previous"] ? "<div>" : "<div class=\"highlight\">"
        update["after div"] += "<h5 data-i18n=\"" + ability.substr(0, 3) + "-u\"></h5><span>";
        update["after div"] += abilities[ability] == abilities[ability + "_previous"] ? "<span class=\"score\">" : "<span class=\"score highlight\">";
        update["after div"] += abilities[ability] + "</span> (";
        update["after div"] += abilities[ability + "_mod"] == abilities[ability + "_previous_mod"] ? "<span class=\"mod\">" : "<span class=\"mod highlight\">";
        update["after div"] += abilities[ability + "_mod"] >= 0 ? "+" + abilities[ability + "_mod"] : abilities[ability + "_mod"];
        update["after div"] += "</span>)</span></div>";
    });
    update["after div"] += "</div></div><div class=\"row\"></div>";

    //Spells
    let selectedSpells = getGainedSpells();
    update["spell_info"] = "<p>You haven't gained any spells</p>";
    if (selectedSpells.length > 0) update["spell_info"] = '<p>You have learnt these spells: ' + selectedSpells.sort().join(", ") + '</p>';

    let gainedFeatures = getGainedFeatures();
    update["feature_info"] = (gainedFeatures.length > 0) ? '<p>You have gained these class features: ' + gainedFeatures.sort().join(", ") + '</p>' :
        "You haven't gained any class features.";

    setCharmancerText(update);
    showChoices(["apply_changes"]);
    console.log(mancerdata["lp-levels"].values);
    console.log(abilities);
    console.log(previous);
});

on("clicked:lp-choices_next", function (eventinfo) {
    const mancerdata = getCharmancerData();
    if (mancerdata["lp-levels"].values.asi === "true") {
        changeCharmancerPage("lp-asi");
    } else if (mancerdata["lp-levels"].values.spells === "true") {
        changeCharmancerPage("lp-spells");
    } else {
        changeCharmancerPage("lp-summary");
    }
});
on("clicked:lp-asi_next", function (eventinfo) {
    const mancerdata = getCharmancerData();
    if (mancerdata["lp-levels"].values.spells === "true") {
        changeCharmancerPage("lp-spells");
    } else {
        changeCharmancerPage("lp-summary");
    }
});
on("clicked:lp-spells_back", function (eventinfo) {
    const mancerdata = getCharmancerData();
    if (mancerdata["lp-levels"].values.asi === "true") {
        changeCharmancerPage("lp-asi");
    } else {
        changeCharmancerPage("lp-choices");
    }
});
on("clicked:lp-summary_back", function (eventinfo) {
    const mancerdata = getCharmancerData();
    if (mancerdata["lp-levels"].values.spells === "true") {
        changeCharmancerPage("lp-spells");
    } else if (mancerdata["lp-levels"].values.asi === "true") {
        changeCharmancerPage("lp-asi");
    } else {
        changeCharmancerPage("lp-choices");
    }
});

//Fixing Bard's Magical Secrets (UC-10)
//By Miguel
//The ways this was being handled before, binded to clicked:repeating_utilityrow_launch, was not being triggered due to the way the DOM is built.
on("clicked:repeating_utilityrow", function (eventinfo) {
    if (eventinfo.triggerName.indexOf('utilityrow_launch') === -1) return;
    const mancerdata = getCharmancerData();
    var querysettings = {};
    var spelldata = getKnownLpSpells(mancerdata);
    var leveldata = _.findWhere(getLevelingData(mancerdata), { classnumber: parseInt(mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_parent`][5]) });
    var query = "";
    let newspells = 0;
    let newcantrips = 0;
    var spellnames = [];
    var current = [];
    var locked = [];
    var update = {};
    update[`${eventinfo.sourceSection} .sheet-warning`] = "";
    try {
        querysettings = JSON.parse(mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_info`]);
    } catch (e) {
        querysettings = mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_info`];
    };
    if (mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_result`]) current = mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_result`].split(", ");
    if (mancerdata["lp-spells"] && mancerdata["lp-spells"].repeating) {
        _.each(mancerdata["lp-spells"].repeating, function (repid) {
            if (mancerdata["lp-spells"].values[`${repid}_checked`]) {
                spelldata[mancerdata["lp-spells"].values[`${repid}_name`]] = {
                    level: mancerdata["lp-spells"].values[`${repid}_level`],
                    spellclass: mancerdata["lp-spells"].values[`${repid}_class`]
                }
            }
        });
    }
    _.each(current, function (currentspell) {
        delete spelldata[currentspell];
    })
    if (querysettings.Known) {
        if (querysettings.Level + "" === "0") {
            newcantrips = 1;
        } else {
            newspells = 1;
        }
        _.each(spelldata, function (spell, spellname) {
            if (!querysettings.Level || (querysettings.Level && querysettings.Level == spell.level)) spellnames.push(spellname);
        });
        if (spellnames.length > 0) {
            query = "Category:Spells Name:" + spellnames.join("|");
        } else {
            update[`${eventinfo.sourceSection} .sheet-warning`] = `You do not currently know any level ${querysettings.Level} spells.`;
            setCharmancerText(update);
        }
    } else {
        query = "Category:Spells";
        if (querysettings.Level) {
            let levels = [querysettings.Level];
            if (querysettings.Level == "max") {
                levels = [];
                for (let x = 1; x <= leveldata.maxspell; x++) {
                    levels.push(x);
                }
            }
            query += " Level:" + levels.join("|");
        };
        if (querysettings.List && querysettings.List.toLowerCase() !== "any") {
            query += " Classes:*" + querysettings.List;
        };
        if (querysettings.Level + "" === "0") {
            newcantrips = querysettings.Number ? parseInt(querysettings.Number) : 1;
        } else {
            newspells = querysettings.Number ? parseInt(querysettings.Number) : 1;
        }
        locked = _.keys(spelldata);
    }
    if (query) {
        setCharmancerText(update);
        changeCharmancerPage("lp-spellchoice", function () {
            getCompendiumQuery([query], function (data) {
                data = removeDuplicatedPageData(data);
                let byLevel = {};
                let filters = {};
                let filtered = [];
                let toSet = {};
                let update = {};
                update["instructions"] = querysettings.HelpText;
                console.log(data);
                _.each(querysettings, function (setting, key) {
                    if (!["Level", "List", "Number", "Type", "ButtonText", "HelpText", "Known", "Class"].includes(key)) {
                        filters[key] = setting;
                    }
                });
                console.log(filters);
                if (querysettings.Known) {
                    delete querysettings.Level;
                }
                delete querysettings.Known;
                _.each(data, function (spell) {
                    let match = true;
                    _.each(filters, function (value, name) {
                        if (spell.data[name] !== value) match = false;
                    })
                    if (match) filtered.push(spell);
                });
                console.log(filtered);
                _.each(filtered, function (spell) {
                    if (spell.data.Classes) {
                        byLevel[spell.data.Level] = byLevel[spell.data.Level] || [];
                        byLevel[spell.data.Level].push({
                            name: spell.name,
                            classes: spell.data.Classes.split(",").map(x => x.trim()),
                            level: parseInt(spell.data.Level)
                        });
                    }
                });
                toSet.newspells = newspells;
                toSet.newcantrips = newcantrips;
                toSet.valid = "now";
                toSet.source = eventinfo.sourceSection;
                setCharmancerText(update);
                setAttrs(toSet, function () {
                    addSpellSections(byLevel, {
                        newcantrips: newcantrips,
                        newspells: newspells,
                        page: "lp-spellchoice",
                        selected: current,
                        locked: locked
                    });
                });
            });
        });/**/
    }
});

//TODO: Investigate if the duplicated event below listener can be removed
//By Miguel
on("clicked:repeating_utilityrow_launch", function (eventinfo) {
    const mancerdata = getCharmancerData();
    var querysettings = {};
    var spelldata = getKnownLpSpells(mancerdata);
    var leveldata = _.findWhere(getLevelingData(mancerdata), { classnumber: parseInt(mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_parent`][5]) });
    var query = "";
    let newspells = 0;
    let newcantrips = 0;
    var spellnames = [];
    var current = [];
    var locked = [];
    var update = {};
    update[`${eventinfo.sourceSection} .sheet-warning`] = "";
    try {
        querysettings = JSON.parse(mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_info`]);
    } catch (e) {
        querysettings = mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_info`];
    };
    if (mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_result`]) current = mancerdata["lp-choices"].values[`${eventinfo.sourceSection}_result`].split(", ");
    if (mancerdata["lp-spells"] && mancerdata["lp-spells"].repeating) {
        _.each(mancerdata["lp-spells"].repeating, function (repid) {
            if (mancerdata["lp-spells"].values[`${repid}_checked`]) {
                spelldata[mancerdata["lp-spells"].values[`${repid}_name`]] = {
                    level: mancerdata["lp-spells"].values[`${repid}_level`],
                    spellclass: mancerdata["lp-spells"].values[`${repid}_class`]
                }
            }
        });
    }
    _.each(current, function (currentspell) {
        delete spelldata[currentspell];
    })
    if (querysettings.Known) {
        if (querysettings.Level + "" === "0") {
            newcantrips = 1;
        } else {
            newspells = 1;
        }
        _.each(spelldata, function (spell, spellname) {
            if (!querysettings.Level || (querysettings.Level && querysettings.Level == spell.level)) spellnames.push(spellname);
        });
        if (spellnames.length > 0) {
            query = "Category:Spells Name:" + spellnames.join("|");
        } else {
            update[`${eventinfo.sourceSection} .sheet-warning`] = `You do not currently know any level ${querysettings.Level} spells.`;
            setCharmancerText(update);
        }
    } else {
        query = "Category:Spells";
        if (querysettings.Level) {
            let levels = [querysettings.Level];
            if (querysettings.Level == "max") {
                levels = [];
                for (let x = 1; x <= leveldata.maxspell; x++) {
                    levels.push(x);
                }
            }
            query += " Level:" + levels.join("|");
        };
        if (querysettings.List && querysettings.List.toLowerCase() !== "any") {
            query += " Classes:*" + querysettings.List;
        };
        if (querysettings.Level + "" === "0") {
            newcantrips = querysettings.Number ? parseInt(querysettings.Number) : 1;
        } else {
            newspells = querysettings.Number ? parseInt(querysettings.Number) : 1;
        }
        locked = _.keys(spelldata);
    }
    if (query) {
        setCharmancerText(update);
        changeCharmancerPage("lp-spellchoice", function () {
            getCompendiumQuery([query], function (data) {
                data = removeDuplicatedPageData(data);
                let byLevel = {};
                let filters = {};
                let filtered = [];
                let toSet = {};
                let update = {};
                update["instructions"] = querysettings.HelpText;
                console.log(data);
                _.each(querysettings, function (setting, key) {
                    if (!["Level", "List", "Number", "Type", "ButtonText", "HelpText", "Known", "Class"].includes(key)) {
                        filters[key] = setting;
                    }
                });
                console.log(filters);
                if (querysettings.Known) {
                    delete querysettings.Level;
                }
                delete querysettings.Known;
                _.each(data, function (spell) {
                    let match = true;
                    _.each(filters, function (value, name) {
                        if (spell.data[name] !== value) match = false;
                    })
                    if (match) filtered.push(spell);
                });
                console.log(filtered);
                _.each(filtered, function (spell) {
                    if (spell.data.Classes) {
                        byLevel[spell.data.Level] = byLevel[spell.data.Level] || [];
                        byLevel[spell.data.Level].push({
                            name: spell.name,
                            classes: spell.data.Classes.split(",").map(x => x.trim()),
                            level: parseInt(spell.data.Level)
                        });
                    }
                });
                toSet.newspells = newspells;
                toSet.newcantrips = newcantrips;
                toSet.valid = "now";
                toSet.source = eventinfo.sourceSection;
                setCharmancerText(update);
                setAttrs(toSet, function () {
                    addSpellSections(byLevel, {
                        newcantrips: newcantrips,
                        newspells: newspells,
                        page: "lp-spellchoice",
                        selected: current,
                        locked: locked
                    });
                });
            });
        });/**/
    }
});

on("page:lp-spellchoice", function () {
    const mancerdata = getCharmancerData();
    if (mancerdata["lp-spellchoice"] && mancerdata["lp-spellchoice"].values.valid === "now") {
        changeCharmancerPage("lp-choices", function () {
            deleteCharmancerData(["lp-spellchoice"]);
        });
    }
});

on("mancerchange:repeating_utilityrow_result", function (eventinfo) {
    if (eventinfo.sourceSection) {
        const mancerdata = getCharmancerData();
        let update = {};
        console.log(`${eventinfo.sourceSection}_title`);
        update[`${eventinfo.sourceSection} label span .sheet-result`] = eventinfo.newValue;
        console.log(update);
        setCharmancerText(update);
    }
});

on("clicked:lp-spellchoice_back", function (eventinfo) {
    const mancerdata = getCharmancerData();
    const leveldata = getLevelingData(mancerdata);
    let result = [];
    let source = mancerdata["lp-spellchoice"].values.source;
    let newspells = false;
    let spellsettings = {};
    if (mancerdata["lp-choices"].values[`${source}_info`]) {
        spellsettings = JSON.parse(mancerdata["lp-choices"].values[`${source}_info`]);
    }
    _.each(mancerdata["lp-spellchoice"].repeating, function (repid) {
        if (mancerdata["lp-spellchoice"].values[`${repid}_checked`] && !mancerdata["lp-spellchoice"].values[`${repid}_existing`]) result.push(mancerdata["lp-spellchoice"].values[`${repid}_name`]);
    });
    if (mancerdata["lp-choices"].values[`${source}_type`] !== "trait") {
        const thisclass = _.findWhere(leveldata, { classnumber: parseInt(mancerdata["lp-choices"].values[`${source}_parent`][5]) });
        newspells = {}
        _.each(mancerdata["lp-spellchoice"].repeating, function (repid) {
            if (mancerdata["lp-spellchoice"].values[`${repid}_checked`] && !mancerdata["lp-spellchoice"].values[`${repid}_existing`]) {
                let thisspell = {
                    ability: thisclass.spellcasting,
                    spellclass: thisclass.classname,
                    level: mancerdata["lp-spellchoice"].values[`${repid}_level`] === "0" ? "cantrip" : mancerdata["lp-spellchoice"].values[`${repid}_level`]
                }
                if (spellsettings.Type) thisspell.known = spellsettings.Type;
                newspells[mancerdata["lp-spellchoice"].values[`${repid}_name`]] = thisspell;
            }
        });
    }
    changeCharmancerPage("lp-choices", function () {
        deleteCharmancerData(["lp-spellchoice"]);
        let set = {};
        set[`${source}_result`] = result.join(", ");
        if (newspells) set[`${source}_spells`] = JSON.stringify(newspells);
        setAttrs(set);
    });
});

on("mancerfinish:lp-mancer", function (eventinfo) {
    console.log("****************************************");
    console.log("******  STARTING FINISH FUNCTION  ******");
    console.log("****************************************");
    var doAllDrops = function (dropArray, callback) {
        getAttrs(["character_id"], function (v) {
            _.each(allAbilities, function (ability) {
                v[ability + "_base"] = abilities[ability];
                v[ability + "_mod"] = abilities[ability];
            });
            v.base_level = set["base_level"];
            v["multiclass1_lvl"] = initial["multiclass1_lvl"];
            v["multiclass2_lvl"] = initial["multiclass2_lvl"];
            v["multiclass3_lvl"] = initial["multiclass3_lvl"];
            v.npc = "0";
            v["class_resource_name"] = previous["class_resource_name"];
            v["other_resource_name"] = previous["other_resource_name"];
            v.speed = previous.speed;
            var update = {};
            var callbacks = [];
            var totalDrops = dropArray.length;
            var x = 0;
            callbacks.push(set_level);
            callbacks.push(update_race_display);
            _.each(dropArray, function (page) {
                page.data.Category = page.data.Category ? page.data.Category.replace("@@!!@@", "") : "";
                var dropUpdate = processDrop(page, v, repeating, true);
                callbacks = callbacks.concat(dropUpdate.callbacks);
                repeating.prof_names = _.uniq(repeating.prof_names.concat(dropUpdate.prof_names));
                update = _.extend(update, dropUpdate.update);
                x++;
                setCharmancerText({ "mancer_progress": '<div style="width: ' + (parseInt(x / totalDrops * 70) + 20) + '%"></div>' });
            });

            callbacks.push(function () { update_ac(); });
            callbacks.push(function () { update_weight(); });
            callbacks.push(callback);
            console.log(update);
            setAttrs(update, { silent: true }, function () {
                setCharmancerText({ "mancer_progress": '<div style="width: 95%"></div>' });
                _.each(callbacks, function (callback) {
                    callback();
                });
            });/**/
        });
    };
    var getOtherDrops = function (pagedata) {
        var results = [];
        if (pagedata["data-Equipment"]) {
            console.log("ADDING ADDITIONAL ITEMS:");
            var json = {};
            try {
                json = JSON.parse(pagedata["data-Equipment"]);
            } catch (e) {
                json = pagedata["data-Equipment"];
            }
            var newItems = makeItemData(json.default);
            results = results.concat(newItems);
        }
        if (pagedata["data-Bundle"]) {
            console.log("ADDING ADDITIONAL ITEMS (FROM BUNDLE):");
            var json = {};
            try {
                json = JSON.parse(pagedata["data-Bundle"]);
            } catch (e) {
                json = pagedata["data-Bundle"];
            }
            var newItems = makeItemData(json);
            results = results.concat(newItems);
        }
        return results;
    };
    var getAllPages = function (pageArray, callback) {
        if (pageArray.length < 1) {
            callback();
            return;
        }
        var getNames = [];
        _.each(pageArray, function (page) {
            if (page.name) {
                getNames.push(page.name);
            } else {
                getNames.push(page);
            }
        });
        getCompendiumPage(getNames, function (data) {
            data = removeDuplicatedPageData(data);
            var nextGet = [];
            if (getNames.length === 1) { data = { 0: data } }; //Fix single spell selections failing.
            _.each(data, function (page, index) {
                var pagedata = false;
                _.each(pageArray, function (arrayData) {
                    if (arrayData.name.toLowerCase() == (page.data.Category + ":" + page.name).toLowerCase()) {
                        pagedata = arrayData;
                    }
                });
                if (pagedata && pagedata.data) {
                    page.data = _.extend(page.data, pagedata.data);
                }
                if (!page.id) page.data.Source = "Charactermancer";
                page.name = page.name.replace(/@@!!@@/g, ""); // Hacky bugfix to prevent custom names from matching unavailable content
                nextGet = nextGet.concat(getOtherDrops(page.data));
                if (page.data["data-Starting Gold"] && !noEquipmentDrop) {
                    set["gp"] += parseInt(page.data["data-Starting Gold"]);
                }
                allPageData.push(page);
            });

            if (nextGet.length > 0) {
                console.log("DOING ANOTHER GET!!");
                getAllPages(nextGet, callback);
            } else {
                callback();
            }

        });
    };
    var startTime = Date.now();
    var allPageData = [];
    var data = eventinfo.data;
    var blobs = getAllLpBlobs(data, true);
    var leveldata = getLevelingData(data);
    var racedata = getLpRaceData(data, leveldata);
    var abilities = getAbilityTotals(data, blobs);
    var previous = data["lp-welcome"].values["previous_attributes"] ? JSON.parse(data["lp-welcome"].values["previous_attributes"]) : {};
    var repeating = data["lp-welcome"].values["previous_repeating"] ? JSON.parse(data["lp-welcome"].values["previous_repeating"]) : {};
    var spelldata = data["lp-welcome"].values["spellinfo"] ? JSON.parse(data["lp-welcome"].values["spellinfo"]) : {};
    var customtraits = { race: [], subrace: [], class: [], subclass: [], background: [] };
    var profs = getProficiencies(data, "lp-finish", blobs);
    var removesections = [];
    var loudset = {};
    var set = {};
    var initial = {};
    var allDrops = [];
    var currentDrop = 0;
    var totalDrops = 1;
    var allSkills = ["athletics", "acrobatics", "sleight_of_hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal_handling", "insight", "medicine", "perception", "survival", "deception", "intimidation", "performance", "persuasion"];
    var allAbilities = abilityList.map(function (x) { return x.toLowerCase() });
    set["lp-mancer_status"] = "";
    console.log(blobs);
    // Build new blobs for traits with inputs, collect custom traits and languages
    _.each(["lp-choices", "lp-asi"], function (pagename) {
        var slide = data[pagename];
        if (slide) {
            console.log(slide);
            _.each(slide.values, function (value, name) {
                if (name.substr(-11) == "trait_input") {
                    let sectionid = name.substring(0, name.length - 6);
                    let thisblob = {};
                    let thistrait = {};
                    let classnumber = _.last(slide.values[sectionid + "_section"].split("--")[0].split("-"));
                    let sectionname = "class" + classnumber;
                    if (slide.values[sectionid + "_section"].includes("subclass")) sectionname += "_subclass";
                    let thissection = _.findWhere(leveldata, { classnumber: parseInt(classnumber) });
                    thistrait.Name = slide.values[sectionid + "_name"].replace(/{{Input}}/g, value);
                    thistrait.Desc = slide.values[sectionid + "_desc"] ? slide.values[sectionid + "_desc"].replace(/{{Input}}/g, value) : "";
                    thisblob.Traits = JSON.stringify([thistrait]);
                    blobs.names[sectionname].push(sectionid);
                    thissection[slide.values[sectionid + "_section"].includes("subclass") ? "subclass" : "class"].blobs[sectionid] = thisblob;
                }
                if (name.split("_")[2] == "custom" && name.substr(-10) == "trait_name") {
                    var sectionid = name.substring(0, name.length - 5);
                    var thistrait = {};
                    thistrait.Name = slide.values[sectionid + "_name"];
                    thistrait.Desc = slide.values[sectionid + "_desc"] ? slide.values[sectionid + "_desc"] : "";
                    customtraits[name.split("_")[3]].push(thistrait);
                }
                if (value == "custom" && name.substr(-18) == "proficiency_choice") {
                    var sectionid = name.substring(0, name.length - 7);
                    if (slide.values[sectionid + "_custom"] && slide.values[sectionid + "_type"]) {
                        profs.all[slide.values[sectionid + "_type"]].push(slide.values[sectionid + "_custom"])
                    }
                }
                if (name.substr(-17) === "utilityrow_result") {
                    let sectionid = name.substring(0, name.length - 7);
                    let thissection = _.findWhere(leveldata, { classnumber: parseInt(slide.values[sectionid + "_parent"][5]) });
                    let section = slide.values[sectionid + "_parent"].includes("subclass") ? "subclass" : "class";
                    if (thissection[section].blobs[slide.values[sectionid + "_blob"]].Traits) thissection[section].blobs[slide.values[sectionid + "_blob"]].Traits = thissection[section].blobs[slide.values[sectionid + "_blob"]].Traits.replace(/{{Input}}/g, value);
                }
            });
        }
    });
    _.each(leveldata, function (level) {
        var name = "class" + level.classnumber;
        var mc = "multiclass" + (level.classnumber - 1);
        var thisclass = { name: removeExpansionInfo(level.classname), data: level.class };
        //if this is an mc class, add mc data
        if (name != "class1") thisclass.data.multiclass = mc;
        thisclass.data.theseblobs = blobs.names[name];
        allPageData.push(thisclass);
        if (level.subclass) {
            var thissubclass = { name: removeExpansionInfo(level.subclassname), data: level.subclass };
            //if this is an mc subclass, add mc data
            if (name != "class1") thissubclass.data.multiclass = mc;
            thissubclass.data.theseblobs = blobs.names[name + "_subclass"];
            allPageData.push(thissubclass);
        }
        //set up the setAttrs for this class
        if (name === "class1") {
            set["base_level"] = parseInt(previous["base_level"]) + level.addlevel;
        } else {
            initial[mc + "_lvl"] = previous[mc + "_flag"] === "0" ? level.addlevel : parseInt(previous[mc + "_lvl"]) + level.addlevel;
        }
    });
    _.each(racedata, function (level, label) {
        _.each(["", "sub"], function (prefix) {
            let section = prefix + label;
            if (previous[section] && blobs.names[section] && blobs.names[section].length > 0) {
                let thisDrop = { name: previous[section], data: { Category: section[0].toUpperCase() + section.substring(1, section.length) + "s" } };
                thisDrop.data.blobs = data["lp-welcome"].data["lp-" + section].blobs;
                thisDrop.data.theseblobs = blobs.names[section];
                allPageData.push(thisDrop);
            }
        });
    });
    //Set up proficiency drops
    _.each(["Armor", "Language", "Tool", "Weapon"], function (proftype) {
        _.each(profs.all[proftype], function (prof) {
            if (prof) {
                var profdata = { name: "Proficiencies:" + prof, data: { Type: proftype } }
                if (profs.all.Expertise.includes(prof)) {
                    profdata.data["toolbonus_base"] = "(@{pb}*2)";
                    allDrops.unshift(profdata);
                } else {
                    allDrops.push(profdata);
                }
            };
        });
    });
    console.log(profs.all);
    //Set up expertise drops
    _.each(_.uniq(profs.all.Skill.concat(profs.all.Expertise)), function (prof) {
        var profName = prof.toLowerCase().replace(/ /g, "_");
        initial[profName + "_prof"] = "(@{pb}*@{" + profName + "_type})";
        if (profs.all.Expertise.indexOf(prof) != -1) {
            set[profName + "_type"] = 2;
        }
    });
    //Set up Ability scores
    initial["hp"] = getHpTotal(data, blobs);
    initial["hp_max"] = initial["hp"];
    _.each(allAbilities, function (ability) {
        loudset[ability + "_base"] = abilities[ability];
        loudset[ability + "_maximum"] = abilities[ability + "_maximum"];
    });
    //Set up spell drops
    if (data["lp-spells"] && data["lp-spells"].repeating) {
        _.each(data["lp-spells"].repeating, function (repid) {
            if (data["lp-spells"].values[repid + "_checked"]) {
                var spelldata = { name: "Spells:" + data["lp-spells"].values[repid + "_name"], data: {} };
                if (data["lp-spells"].values[repid + "_ability"]) spelldata.data["spellcasting_ability"] = data["lp-spells"].values[repid + "_ability"];
                if (data["lp-spells"].values[repid + "_class"]) spelldata.data["spellclass"] = data["lp-spells"].values[repid + "_class"];
                if (data["lp-spells"].values[repid + "_source"]) spelldata.data["spellsource"] = data["lp-spells"].values[repid + "_source"];
                allDrops.push(spelldata);
            }
            if (data["lp-spells"].values[repid + "_existing"] && !data["lp-spells"].values[repid + "_checked"]) {
                var lvl = data["lp-spells"].values[repid + "_level"];
                var id = "";
                _.each(repeating["spell-" + lvl], function (spell, spellid) {
                    if (spell.spellname.toLowerCase() == data["lp-spells"].values[repid + "_name"].toLowerCase()) {
                        id = spellid;
                        if (spell.spellattackid) removesections.push("repeating_attack_" + spell.spellattackid);
                    };
                });
                removesections.push("repeating_spell-" + lvl + "_" + id);
            }
        });
    } else {
        //If there was no spell page, need to drop any new "known" spells
        _.each(blobs.sorted, function (section, name) {
            _.each(section, function (blob) {
                if (blob.Spells) {
                    spells = JSON.parse(blob.Spells);
                    _.each(spells, function (spell) {
                        if (spell.Known) {
                            _.each(spell.Known, function (spellname) {
                                var thisspell = { name: "Spells:" + spellname, data: {} };
                                var thisclass = name.substring(0, 5) === "class" ? _.last(data["lp-levels"].values[name.split("_")[0]].split(":")) : "Racial";
                                if (spell.Ability) thisspell.data["spellcasting_ability"] = spell.Ability;
                                if (spell.Source) thisspell.data["spellsource"] = spell.Source;
                                thisspell.data["spellclass"] = thisclass;
                                allDrops.push(thisspell);
                            });
                        };
                    });
                };
            });
        });
    };
    //Gater spells from class features
    _.each(data, function (page, pagename) {
        if (pagename.split("-")[0] == "lp") {
            _.each(page.values, function (value, name) {
                if (name.substr(-18) === "_utilityrow_spells") {
                    let featurespells = JSON.parse(value);
                    _.each(featurespells, function (spell, spellname) {
                        var thisspell = { name: "Spells:" + spellname, data: {} };
                        if (spell.ability) thisspell.data["spellcasting_ability"] = spell.ability;
                        if (spell.known) thisspell.data["spellsource"] = spell.known;
                        if (spell.spellclass) thisspell.data["spellclass"] = spell.spellclass;
                        allDrops.push(thisspell);
                    })
                }
            });
        }
    });
    //unset charmancer step
    set["lpmancer_status"] = "";
    set["charactermancer_step"] = "lp-welcome";
    console.log(allDrops);
    console.log(allPageData);
    _.each(removesections, function (rowid) {
        removeRepeatingRow(rowid);
    });
    setCharmancerText({ "mancer_progress": '<div style="width: 5%"></div>' });
    //first set is silent to prevent unwanted sheet workers
    setAttrs(initial, { silent: true }, function () {
        setCharmancerText({ "mancer_progress": '<div style="width: 10%"></div>' });
        //reset remaining attributes, and set ability scores/custom info
        setAttrs(loudset, function () {
            setCharmancerText({ "mancer_progress": '<div style="width: 15%"></div>' });
            getAllPages(allDrops, function () {
                setCharmancerText({ "mancer_progress": '<div style="width: 20%"></div>' });
                doAllDrops(allPageData, function () {
                    console.log("DOING THE FINAL SET!!");
                    setAttrs(set, function () {
                        setCharmancerText({ "mancer_progress": '<div style="width: 100%"></div>' });
                        organize_section_proficiencies();
                        update_skills(allSkills);
                        update_attacks("all");
                        deleteCharmancerData(["lp-welcome", "lp-levels", "lp-choices", "lp-asi", "lp-spells", "lp-summary"]);
                        var endTime = Date.now();
                        console.log("Elapsed time: ");
                        console.log((endTime - startTime) / 1000);
                        finishCharactermancer();
                    });
                });
            });
        });
    });
    /* */
});
 //# sourceURL=dnd5e.js
