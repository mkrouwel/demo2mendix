import { datatypes } from 'mendixmodelsdk';
import { ParameterDataType, SimpleEntity, SimpleEnumeration, SimpleMicroflow, SimpleModel, SimpleModule } from '../mendixsdk/build/simplesdk.js'
import descriptor from "./descriptor.json" assert { type: "json" };

descriptor.demomodel;
const demomodel = (await import(descriptor.demomodel, { assert: { type: 'json' } })).default;
console.log(demomodel);

const simpleModel: SimpleModel = new SimpleModel();
await simpleModel.openExistingApp(descriptor.appid);
//await simpleModel.createAndOpenApp(descriptor.appname)
await simpleModel.deleteModules(descriptor.defaultmodule, true)
const simpleModule: SimpleModule = simpleModel.addModule(descriptor.defaultmodule + (new Date()).toISOString());
const [userRole] = await simpleModule.addModuleRoles({ User: "User" });
const assResult = simpleModule.addEntity("AssessmentResult", undefined, false)
assResult.addBooleanAttribute("AssessmentResult")

interface Dictionary<Type> {
    [key: string]: Type;
}


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

let entities: Dictionary<SimpleEntity> = {};
let primitives: Dictionary<string> = {};
let enums: Dictionary<SimpleEnumeration> = {};

// entities first
for (let factkind of demomodel.factkinds.filter(f => f.type == "entitytype")) {
    console.log(factkind.name)
    entities[factkind.name] = simpleModule.addEntity(factkind.name);
}

// transaction kinds
for (let transaction of demomodel.transactionkinds) {
    console.log(transaction.name)
    switch (transaction.type) {
        case "elementary":
            const tkEntity = simpleModule.addEntity(transaction.productname);
            for (let casekind of transaction.casekinds) {
                tkEntity.addAssociation(entities[casekind], undefined)
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
    console.log(factkind.name)
    switch (factkind.type) {
        case "entitytype":
            //skip
            break;
        case "valuetype":
            if (factkind.values) {
                const newEnum = simpleModule.addEnumeration(factkind.name);
                factkind.values.split(", ").forEach(v => {
                    newEnum.addEnumerationValue(v, v)
                });
                enums[factkind.name] = newEnum;
            } else primitives[factkind.name] = factkind.primitive;
            break;
        case "propertytype":
            entities[factkind.domain].addAssociation(entities[factkind.range], undefined, undefined, undefined, factkind.name);
            break;
        case "attributetype":
            if (enums[factkind.range])
                entities[factkind.domain].addEnumAttribute(factkind.name, enums[factkind.range]);
            else
                switch (primitives[factkind.range]) {
                    case "datetime": entities[factkind.domain].addDateTimeAttribute(factkind.name);
                        break;
                    case "bool": entities[factkind.domain].addBooleanAttribute(factkind.name);
                        break;
                    case "integer": entities[factkind.domain].addIntegerAttribute(factkind.name);
                        break;
                    case "number": entities[factkind.domain].addDecimalAttribute(factkind.name);
                        break;
                    default: throw new Error(factkind.range + "not supported");
                }
            break;
        case "derived":
            let datatype: datatypes.DataType =
                factkind.result
                    ? factkind.result.startsWith("primitive:")
                        ? convertPrimitiveToDataType(factkind.result.substring(factkind.result.indexOf(":" + 1)))
                        : entities[factkind.result]
                            ? datatypes.ObjectType.create(simpleModel.mxModel)
                            : convertPrimitiveToDataType(primitives[factkind.result])
                    : datatypes.VoidType.create(simpleModel.mxModel);

            const newMF: SimpleMicroflow = simpleModule.addMicroflow("Calculate_" + factkind.name);
            // TODO: set return type
            for (let parameter of factkind.parameters) {
                if (entities[parameter])
                    newMF.addEntityMicroflowParameter(parameter, ParameterDataType.Entity, entities[parameter].mxEntity);
                else if (parameter[0] == "[" && parameter.slice(-1) == "]") {
                    let entity = entities[parameter.substring(1, parameter.length - 1)];
                    if (entity)
                        newMF.addEntityMicroflowParameter(parameter, ParameterDataType.List, entity.mxEntity);
                }
                else switch (primitives[parameter]) {
                    case "datetime": newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.DateTime);
                        break;
                    case "bool": newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.Boolean);
                        break;
                    case "integer": newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.IntegerLong);
                        break;
                    case "number": newMF.addPrimitiveMicroflowParameter(parameter, ParameterDataType.Decimal);
                        break;
                    default: throw new Error(primitives[parameter] + "not supported");
                }
                newMF.addEndEvent(newMF.mxStartEvent, 1);
            }
            break;
        default: throw new Error(factkind.type + "not supported");
    }
}

// action rules
for (let actionrule of demomodel.actionrules) {
    // process event part...
    const newMF: SimpleMicroflow = simpleModule.addMicroflow("AssessTruth_" + actionrule.actorrole + "_" + actionrule.id);
    newMF.addEntityMicroflowParameter("AssessmentResult", ParameterDataType.Entity, assResult.mxEntity)
    // TODO: assResult as return type
    newMF.addEndEvent(newMF.mxStartEvent, 1);
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

function convertPrimitiveToDataType(primitive: string): datatypes.DataType {
    switch (primitive) {
        case "datetime": return datatypes.DateTimeType.create(simpleModel.mxModel);
    }
}
