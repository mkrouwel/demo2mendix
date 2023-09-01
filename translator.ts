import { BasicRelativePosition, SimpleDataType, SimpleEnumeration, SimpleMicroflow, SimpleModel, SimpleModule } from "@trives/mxsdkcore/build/simplesdk/simplesdk.js";
import { Dictionary, Lib } from "@trives/mxsdkcore/build/lib/lib.js";
import { pages } from "mendixmodelsdk";
import { SmartGenerator } from "@trives/mxsmartstuff/build/smartstuff/smartgenerator.js";

import config from "./config.json" assert { type: "json" };
import descriptor from "./shdescriptor.json" assert { type: "json" };

const demomodel = (await import(descriptor.demomodel, { assert: { type: 'json' } })).default;
console.log(demomodel);

const simpleModel: SimpleModel = new SimpleModel(config.mendixtoken);
//await simpleModel.openExistingApp(descriptor.appid);
await simpleModel.createAndOpenApp(descriptor.appname + Lib.getCurrentDateTime())
//await simpleModel.deleteModules(descriptor.defaultmodule, true)
const module: SimpleModule = simpleModel.addModule(descriptor.defaultmodule + Lib.getCurrentDateTime());
const [userRole] = await module.addModuleRoles({ User: "User" });
const mfFolder = module.addFolder("microflows");
const pageFolder = module.addFolder("pages");
const assResult = module.addEntity("AssessmentResult", undefined, false)
assResult.addBooleanAttribute("AssessmentResult")
const layout = simpleModel.mxModel.findLayoutByQualifiedName("Atlas_Core.Atlas_TopBar") as pages.Layout;

// entities first
for (let factkind of demomodel.factkinds.filter((f: any) => f.type == "entitytype")) {
    console.log(factkind.name)
    const newEntity = module.addEntity(factkind.name);
    //SmartGenerator.generateAllForEntity(newEntity);
}

// create enums for primitives with values
let enums: Dictionary<SimpleEnumeration> = {};
for (let vtmapping of descriptor.valuetypemapping) {
    if (vtmapping.values) {
        const newEnum = module.addEnumeration(vtmapping.name);
        vtmapping.values.split(", ").forEach(v => {
            newEnum.addEnumerationValue(v, v)
        });
        enums[vtmapping.name] = newEnum;
    }
}

// transaction kinds
for (let transactorrole of demomodel.transactorroles) {
    console.log(transactorrole.name)
    const tkEntity = module.addEntity(transactorrole.productname);
    for (let casekind of transactorrole.casekinds) {
        tkEntity.addAssociation(module.entities[casekind])
    }

    if (transactorrole.focus) {
        pageFolder.addPage(`Request_TK${transactorrole.id}`, `Request_TK${transactorrole.id}`, layout)
    }
}

// other fact kinds
for (let factkind of demomodel.factkinds) {
    console.log(`Processing ${factkind.name}`)
    switch (factkind.type) {
        case "entitytype":
            //skip
            break;
        case "valuetype":
            //skip
            break;
        case "propertytype":
            module.entities[factkind.domain].addAssociation(module.entities[factkind.range], undefined, undefined, undefined, undefined, factkind.name);
            break;
        case "attributetype":
            if (enums[factkind.range]) {
                module.entities[factkind.domain].addEnumAttribute(factkind.name, enums[factkind.range]);
                break;
            }

            const vtmapping = descriptor.valuetypemapping.find(i => i.name == factkind.range);
            if (!vtmapping) {
                console.warn(`Couldnt find value type mapping for ${factkind.range}, skipping attribute`);
                break;
            }

            switch (vtmapping.primitive) {
                case "string": module.entities[factkind.domain].addStringAttribute(factkind.name);
                    break;
                case "datetime": module.entities[factkind.domain].addDateTimeAttribute(factkind.name);
                    break;
                case "boolean": module.entities[factkind.domain].addBooleanAttribute(factkind.name);
                    break;
                case "integer": module.entities[factkind.domain].addIntegerAttribute(factkind.name);
                    break;
                case "decimal": module.entities[factkind.domain].addDecimalAttribute(factkind.name);
                    break;
                default: throw new Error(`${vtmapping.primitive} not supported`);
            }
            break;
        case "derived":
            const newMF: SimpleMicroflow = mfFolder.addMicroflow(`Calculate_${factkind.name}`);

            if (factkind.range) {
                if (module.entities[factkind.range])
                    newMF.entityReturnType = module.entities[factkind.range]
                else if (factkind.range[0] == "[" && factkind.range.slice(-1) == "]") {
                    let entity = module.entities[factkind.range.substring(1, factkind.range.length - 1)];
                    if (entity)
                        newMF.listReturnType = entity;
                }
                else {
                    if (enums[factkind.range]) {
                        newMF.enumerationReturnType = enums[factkind.range];
                        break;
                    }

                    const vtmapping = descriptor.valuetypemapping.find(i => i.name == factkind.range);
                    if (!vtmapping) {
                        console.warn(`Couldnt find value type mapping for ${factkind.range}, skipping parameter`);
                        break;
                    }

                    newMF.primitiveReturnType = convertPrimitiveToDataType(vtmapping.primitive);
                }
            }

            for (let parameter of factkind.domain) {
                if (module.entities[parameter])
                    newMF.addEntityMicroflowParameter(parameter, module.entities[parameter]);
                else if (parameter[0] == "[" && parameter.slice(-1) == "]") {
                    let entity = module.entities[parameter.substring(1, parameter.length - 1)];
                    if (entity)
                        newMF.addEntityMicroflowParameter(parameter, entity, true);
                }
                else {
                    if (enums[parameter]) {
                        module.entities[factkind.domain].addEnumAttribute(factkind.name, enums[parameter]);
                        break;
                    }

                    const vtmapping = descriptor.valuetypemapping.find(i => i.name == parameter);
                    if (!vtmapping) {
                        console.warn(`Couldnt find value type mapping for ${parameter}, skipping parameter`);
                        break;
                    }

                    newMF.addPrimitiveMicroflowParameter(parameter, convertPrimitiveToDataType(vtmapping.primitive));
                }
            }

            newMF.addEndEvent(newMF.startEvent, BasicRelativePosition.RIGHT);
            break;
        default: throw new Error(`${factkind.type} not supported`);
    }
}

// action rules
for (let actionrule of demomodel.actionrules) {
    // process event part...
    const newMF: SimpleMicroflow = mfFolder.addMicroflow(`AssessTruth_ARS${actionrule.id}_AR${actionrule.ear}`);
    newMF.addEntityMicroflowParameter("AssessmentResult", assResult)
    newMF.addEndEvent(newMF.startEvent, BasicRelativePosition.RIGHT);

    let pageName = `ActOn_${actionrule.when}`;
    if (actionrule.while && actionrule.while.length > 0) {
        pageName += '_while_' + actionrule.while.join()
    }
    if (actionrule.whileall && actionrule.whileall.length > 0) {
        pageName += '_whileall_' + actionrule.whileall.join()
    }
    pageFolder.addPage(pageName, pageName, layout)
    // TODO: process response part...
}

// OIVs
for (let oiv of descriptor.oivs) {
    const oivEntity = module.addEntity(oiv.name);
    oivEntity.addStringAttribute("Name");
}

await simpleModel.commit("Generated app v1");
console.log(simpleModel.appURL);
process.exit();

function convertPrimitiveToDataType(primitive: string): SimpleDataType {
    switch (primitive) {
        case "datetime": return SimpleDataType.DateTime;
        case "integer": return SimpleDataType.IntegerLong;
        case "decimal": return SimpleDataType.Decimal;
        case "string": return SimpleDataType.String;
        case "boolean": return SimpleDataType.Boolean;
        default:
            throw new Error(`Unknown primitive: ${primitive}`)
    }
}
