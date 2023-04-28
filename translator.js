import { BasicRelativePosition, ParameterDataType, SimpleModel } from '../mendixsdk/build/simplesdk/simplesdk.js';
import descriptor from "./descriptor.json" assert { type: "json" };
descriptor.demomodel;
const demomodel = (await import(descriptor.demomodel, { assert: { type: 'json' } })).default;
console.log(demomodel);
const simpleModel = new SimpleModel();
//await simpleModel.openExistingApp(descriptor.appid);
await simpleModel.createAndOpenApp(descriptor.appname + (new Date()).toISOString());
await simpleModel.deleteModules(descriptor.defaultmodule, true);
const simpleModule = simpleModel.addModule(descriptor.defaultmodule + (new Date()).toISOString());
const [userRole] = await simpleModule.addModuleRoles({ User: "User" });
const mfFolder = simpleModule.addFolder("microflows");
const pageFolder = simpleModule.addFolder("pages");
const assResult = simpleModule.addEntity("AssessmentResult", undefined, false);
assResult.addBooleanAttribute("AssessmentResult");
const layout = simpleModel.mxModel.findLayoutByQualifiedName("Atlas_Core.Atlas_TopBar");
/*
case "eventtype":
            
const entity = domainmodels.Entity.createIn(domainModel);
entity.name = replaceWhiteSpace(factkind.name);
//domainmodels.Generalization.createIn(entity).generalization = model.findEntityByQualifiedName("Transaction.Proposition"); TODO

const assoc = domainmodels.Association.createIn(domainModel);
assoc.name = replaceWhiteSpace(factkind.parameter);
assoc.parent = entity;
assoc.child = domainModel.entities.find(e => e.name == replaceWhiteSpace(factkind.parameter));
break;
*/
// actor roles ...
let entities = {};
let primitives = {};
let enums = {};
// entities first
for (let factkind of demomodel.factkinds.filter(f => f.type == "entitytype")) {
    console.log(factkind.name);
    entities[factkind.name] = simpleModule.addEntity(factkind.name);
    //SmartGenerator.generateAllForEntity(entities[factkind.name])
}
// transaction kinds
for (let transaction of demomodel.transactionkinds) {
    console.log(transaction.name);
    switch (transaction.type) {
        case "elementary":
            const tkEntity = simpleModule.addEntity(transaction.productname);
            for (let casekind of transaction.casekinds) {
                tkEntity.addAssociation(entities[casekind]);
            }
            entities[transaction.productname] = tkEntity;
            if (transaction.in) {
                pageFolder.addPage(`Request_${transaction.id}`, `Request_${transaction.id}`, layout);
            }
            break;
        case "aggregate":
            // nothing todo
            break;
        default: throw new Error(`${transaction.type} not supported`);
    }
}
// other fact kinds
for (let factkind of demomodel.factkinds) {
    console.log(`Processing ${factkind.name}`);
    switch (factkind.type) {
        case "entitytype":
            //skip
            break;
        case "valuetype":
            if (factkind.values) {
                const newEnum = simpleModule.addEnumeration(factkind.name);
                factkind.values.split(", ").forEach(v => {
                    newEnum.addEnumerationValue(v, v);
                });
                enums[factkind.name] = newEnum;
            }
            else
                primitives[factkind.name] = factkind.primitive;
            break;
        case "propertytype":
            entities[factkind.domain].addAssociation(entities[factkind.range], undefined, undefined, undefined, undefined, factkind.name);
            break;
        case "attributetype":
            if (enums[factkind.range])
                entities[factkind.domain].addEnumAttribute(factkind.name, enums[factkind.range]);
            else
                switch (primitives[factkind.range]) {
                    case "datetime":
                        entities[factkind.domain].addDateTimeAttribute(factkind.name);
                        break;
                    case "bool":
                        entities[factkind.domain].addBooleanAttribute(factkind.name);
                        break;
                    case "integer":
                        entities[factkind.domain].addIntegerAttribute(factkind.name);
                        break;
                    case "number":
                        entities[factkind.domain].addDecimalAttribute(factkind.name);
                        break;
                    default: throw new Error(`${factkind.rang} not supported`);
                }
            break;
        case "derived":
            const newMF = mfFolder.addMicroflow(`Calculate_${factkind.name}`);
            if (factkind.result) {
                if (factkind.result.startsWith("primitive:")) {
                    newMF.setPrimitiveMicroflowReturnType(convertPrimitiveToDataType(factkind.result.substring(factkind.result.indexOf(":") + 1)));
                }
                else if (entities[factkind.result]) {
                    newMF.setEntityMicroflowReturnType(entities[factkind.result]);
                }
                else if (primitives[factkind.result]) {
                    newMF.setPrimitiveMicroflowReturnType(convertPrimitiveToDataType(primitives[factkind.result]));
                }
            }
            for (let parameter of factkind.parameters) {
                if (entities[parameter])
                    newMF.addEntityMicroflowParameter(parameter, entities[parameter]);
                else if (parameter[0] == "[" && parameter.slice(-1) == "]") {
                    let entity = entities[parameter.substring(1, parameter.length - 1)];
                    if (entity)
                        newMF.addEntityMicroflowParameter(parameter, entity, true);
                }
                else
                    switch (primitives[parameter]) {
                        case "datetime":
                            newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.DateTime);
                            break;
                        case "bool":
                            newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.Boolean);
                            break;
                        case "integer":
                            newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.IntegerLong);
                            break;
                        case "number":
                            newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.Decimal);
                            break;
                        default: throw new Error(`${primitives[parameter]} not supported`);
                    }
            }
            newMF.addEndEvent(newMF.mxStartEvent, BasicRelativePosition.RIGHT);
            break;
        default: throw new Error(`${factkind.type} not supported`);
    }
}
// action rules
for (let actionrule of demomodel.actionrules) {
    // process event part...
    const newMF = mfFolder.addMicroflow(`AssessTruth_${actionrule.actorrole}_${actionrule.id}`);
    newMF.addEntityMicroflowParameter("AssessmentResult", assResult);
    newMF.addEndEvent(newMF.mxStartEvent, BasicRelativePosition.RIGHT);
    let pageName = `ActOn_${actionrule.when}`;
    if (actionrule.while && actionrule.while.length > 0) {
        pageName += '_while_' + actionrule.while.join();
    }
    if (actionrule.whileall && actionrule.whileall.length > 0) {
        pageName += '_whileall_' + actionrule.whileall.join();
    }
    pageFolder.addPage(pageName, pageName, layout);
    // process response part...
}
// OIVs
for (let oiv of demomodel.oivs) {
    const oivEntity = simpleModule.addEntity(oiv.name);
    oivEntity.addStringAttribute("Name");
}
await simpleModel.commit("Generated app v1");
process.exit();
function convertPrimitiveToDataType(primitive) {
    switch (primitive) {
        case "datetime": return ParameterDataType.DateTime;
        case "integer": return ParameterDataType.IntegerLong;
        case "number": return ParameterDataType.Decimal;
        case "string": return ParameterDataType.String;
        case "boolean": return ParameterDataType.Boolean;
        default:
            throw new Error(`Unknown primitive: ${primitive}`);
    }
}
