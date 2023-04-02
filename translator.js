import { SimpleModel } from '../mendixsdk/build/index.js';
import { DataType } from '../mendixsdk/build/lib/dict.js';
import descriptor from "./descriptor.json" assert { type: "json" };
descriptor.demomodel;
const demomodel = (await import(descriptor.demomodel, { assert: { type: 'json' } })).default;
console.log(demomodel);
const simpleModel = new SimpleModel();
await simpleModel.openExistingApp(descriptor.appid);
//await simpleModel.createAndOpenApp(descriptor.appname)
await simpleModel.deleteModules(descriptor.defaultmodule, true);
const simpleModule = simpleModel.addModule(descriptor.defaultmodule + (new Date()).toISOString());
const [userRole] = await simpleModule.addModuleRoles({ User: "User" });
simpleModule.addEntity("AssessmentResult", undefined, false).addBooleanAttribute("AssessmentResult");
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
}
// transaction kinds
for (let transaction of demomodel.transactionkinds) {
    console.log(transaction.name);
    switch (transaction.type) {
        case "elementary":
            const tkEntity = simpleModule.addEntity(transaction.productname);
            for (let casekind of transaction.casekinds) {
                tkEntity.addAssociation(entities[casekind], undefined);
            }
            entities[transaction.productname] = tkEntity;
            break;
        case "aggregate":
            // nothing todo
            break;
        default: throw new Error(transaction.type + "not supported");
    }
}
// other fact kinds
for (let factkind of demomodel.factkinds) {
    //console.info(entities)
    console.log(factkind.name);
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
            entities[factkind.domain].addAssociation(entities[factkind.range], undefined, undefined, undefined, factkind.name);
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
                    default: throw new Error(factkind.range + "not supported");
                }
            break;
        case "derived":
            const newMF = simpleModule.addMicroflow("Calculate_" + factkind.name);
            for (let parameter of factkind.parameters) {
                if (entities[parameter])
                    newMF.addMicroflowParameter(parameter, DataType.Entity, entities[parameter]._entity);
                else
                    switch (primitives[parameter]) {
                        case "datetime":
                            newMF.addMicroflowParameter(parameter, DataType.DateTime);
                            break;
                        case "bool":
                            newMF.addMicroflowParameter(parameter, DataType.Boolean);
                            break;
                        case "integer":
                            newMF.addMicroflowParameter(parameter, DataType.Integer);
                            break;
                        case "number":
                            newMF.addMicroflowParameter(parameter, DataType.Decimal);
                            break;
                        default: throw new Error(primitives[parameter] + "not supported");
                    }
                newMF.addEndEvent(newMF.getStartEvent(), 1);
            }
            break;
        default: throw new Error(factkind.type + "not supported");
    }
}
// action rules
for (let actionrule of demomodel.actionrules) {
    // process event part...
    const newMF = simpleModule.addMicroflow("AssessTruth_" + actionrule.actorrole + "_" + actionrule.id);
    newMF.addEndEvent(newMF.getStartEvent(), 1);
    //newMF.addMicroflowObjectParameter("Account", entityAccountToValidate, "The object to validate");
    // process response part...
}
// OIVs
for (let oiv of demomodel.oivs) {
    const oivEntity = simpleModule.addEntity(oiv.name);
    oivEntity.addStringAttribute("Name");
}
await simpleModel.commit("Generated app v1");
process.exit();
