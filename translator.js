import { MendixPlatformClient } from "mendixplatformsdk";
import { projects, security, domainmodels, microflows, enumerations, texts } from "mendixmodelsdk";
import descriptor from "./descriptor.json";
descriptor.demomodel;
const demomodel = (await import(descriptor.demomodel)).default;
console.log(demomodel);
const workingCopy = await loadWorkingCopy();
const model = await workingCopy.openModel();
const [module, domainModel] = createModule();
// transaction kinds
// actor roles ...
// fact kinds
for (var i = 0; i < demomodel.factkinds.length; i++) {
    var factkind = demomodel.factkinds[i];
    if (factkind.type === "entitytype") {
        const entity = domainmodels.Entity.createIn(domainModel);
        entity.name = replaceWhiteSpace(factkind.name);
    }
    else if (factkind.type === "valuetype") {
        const enumE = enumerations.Enumeration.createIn(module);
        enumE.name = replaceWhiteSpace(factkind.name);
        factkind.values.split(", ").forEach(v => {
            const enumV = enumerations.EnumerationValue.createIn(enumE);
            enumV.name = replaceWhiteSpace(v);
            texts.Text.createInEnumerationValueUnderCaption(enumV);
            //TODO: need to set caption text here...
        });
    }
    else if (factkind.type === "propertytype") {
        const assoc = domainmodels.Association.createIn(domainModel);
        assoc.name = replaceWhiteSpace(factkind.name);
        assoc.parent = domainModel.entities.find(e => e.name == replaceWhiteSpace(factkind.domain));
        assoc.child = domainModel.entities.find(e => e.name == replaceWhiteSpace(factkind.range));
    }
    else if (factkind.type === "attributetype") {
        const attr = domainmodels.Attribute.createIn(domainModel.entities.find(e => e.name == replaceWhiteSpace(factkind.domain)));
        attr.name = replaceWhiteSpace(factkind.name);
        if (factkind.range == "datetime")
            domainmodels.DateTimeAttributeType.createInAttributeUnderType(attr);
        if (factkind.range == "bool")
            domainmodels.BooleanAttributeType.createInAttributeUnderType(attr);
        if (factkind.range == "number")
            domainmodels.IntegerAttributeType.createInAttributeUnderType(attr);
        if (factkind.range == "money")
            domainmodels.DecimalAttributeType.createInAttributeUnderType(attr);
        else { // suppose enum
            // const enumT = domainmodels.EnumerationAttributeType.createInAttributeUnderType(attr);
            // need to set the right enum but below doesnt work...
            // enumT.enumeration = model.findEnumerationByQualifiedName(descriptor.defaultmodule + "." + replaceWhiteSpace(factkind.range));
        }
    }
    else if (factkind.type === "eventtype") {
        const entity = domainmodels.Entity.createIn(domainModel);
        entity.name = replaceWhiteSpace(factkind.name);
        const assoc = domainmodels.Association.createIn(domainModel);
        assoc.name = replaceWhiteSpace(factkind.parameter);
        assoc.parent = entity;
        assoc.child = domainModel.entities.find(e => e.name == replaceWhiteSpace(factkind.parameter));
    }
    else if (factkind.type === "derived") {
        const microflow = microflows.Microflow.createIn(module);
        microflow.name = "Calculate_" + replaceWhiteSpace(factkind.name);
        microflows.StartEvent.createIn(microflow.objectCollection);
        microflows.EndEvent.createIn(microflow.objectCollection);
        const parameter = microflows.MicroflowParameterObject.createIn(microflow.objectCollection);
        parameter.name = replaceWhiteSpace(factkind.parameter);
    }
}
// action rules
for (var i = 0; i < demomodel.actionrules.length; i++) {
    var actionrule = demomodel.actionrules[i];
    // process event part...
    const microflow = microflows.Microflow.createIn(module);
    microflow.name = "AssessTruth_" + actionrule.actorrole + "_" + replaceWhiteSpace(actionrule.name);
    microflows.StartEvent.createIn(microflow.objectCollection);
    microflows.EndEvent.createIn(microflow.objectCollection);
    // process response part...
}
// OIVs
for (var i = 0; i < demomodel.oivs.length; i++) {
    var oiv = demomodel.oivs[i];
    const entity = domainmodels.Entity.createIn(domainModel);
    entity.name = replaceWhiteSpace(oiv.name);
}
await model.flushChanges();
await workingCopy.commitToRepository("trunk", { commitMessage: "Generated app v1" });
async function loadWorkingCopy() {
    const client = new MendixPlatformClient();
    var app;
    // @ts-ignore
    if (descriptor.appid != null)
        // @ts-ignore
        app = client.getApp(descriptor.appid);
    else
        app = await client.createNewApp(descriptor.appname + Date.now());
    return app.createTemporaryWorkingCopy("trunk");
}
function createModule() {
    // try to load module if it exists, but run into IModule vs Module issues...
    //const defaultModule = model.findModuleByQualifiedName(replaceWhiteSpace(descriptor.defaultmodule));
    //if (defaultModule != null) {
    //    return [defaultModule, defaultModule.domainModel];
    //} 
    const module = projects.Module.createIn(model.allProjects()[0]);
    module.name = replaceWhiteSpace(descriptor.defaultmodule);
    const moduleSecurity = security.ModuleSecurity.createIn(module);
    const domainModel = domainmodels.DomainModel.createIn(module);
    return [module, domainModel];
}
function replaceWhiteSpace(s) {
    return s.replace('/\s/g', '_');
}
