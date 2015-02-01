'use strict';

var mongoose = require('mongoose'),
    mockgoose = require('mockgoose'),
    should = require('should'),
    promise = require('promise'),
    security = require('../index'),
    testModel = require('./mongoose.test.model'),
    _ = require('lodash');

mockgoose(mongoose);

security.init();

var TestModel = testModel.model(mongoose);
var SimpleModel = testModel.simpleModel(mongoose);

testModel.policy(security);

var testDocuments = {
    read: {
        yes: [],
        no: []
    },
    write: {
        yes: [],
        no: []
    },
    delete: {
        yes: [],
        no: []
    }
};

var simpleDocument;

describe('Security Spec:', function() {
    before(function(done) {
        testModel.testData(security, mongoose, TestModel).then(function(testData) {
            security.securityManager.privileged(function() {
                TestModel.find({}).exec(function(err, documents) {
                    if (err) {
                        done(err);
                        return;
                    }
                    _.forEach(documents, function(document) {
                        var permissions = testData[document._id];
                        _.forOwn(permissions, function(access, permission) {
                            if (access) {
                                testDocuments[permission].yes.push(document);
                            } else {
                                testDocuments[permission].no.push(document);
                            }
                        });
                    });
                    done();
                });
            });
        }).catch(function(err) {
            done(err);
        });
    });

    before(function(done) {
        testModel.simpleModelData(SimpleModel).then(function(document) {
            simpleDocument = document;
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    after(function(done) {
        mockgoose.reset();
        done();
    });

    describe('#askPermission Spec:', function() {
        it('returns true for granted permission on document', function(done) {
            var aReadableDocument = testDocuments.read.yes[0];

            security.askPermission(aReadableDocument, 'read').then(function(decision) {
                /*jshint -W030 */
                //noinspection BadExpressionStatementJS
                decision.should.be.ok;
                done();
            }).catch(function(err) {
                done(err);
            });
        });
        it('returns false for not granted permission on document', function(done) {
            var aUnreadableDocument = testDocuments.read.no[0];

            security.askPermission(aUnreadableDocument, 'read').then(function(decision) {
                /*jshint -W030 */
                //noinspection BadExpressionStatementJS
                decision.should.be.not.ok;
                done();
            }).catch(function(err) {
                done(err);
            });
        });
        it('returns false for permission without rule on document', function(done) {
            var aUndeletableDocument = testDocuments.delete.no[0];

            security.askPermission(aUndeletableDocument, 'delete').then(function(decision) {
                /*jshint -W030 */
                //noinspection BadExpressionStatementJS
                decision.should.be.not.ok;
                done();
            }).catch(function(err) {
                done(err);
            });
        });
    });
    describe('#getPermissions Spec:', function() {
        it('returns correct permissions for readable document', function(done) {
            var aReadableDocument = testDocuments.read.yes[0];

            security.getPermissions(aReadableDocument, ['read', 'write', 'delete']).then(function(permissions) {
                should.exist(permissions);
                permissions.should.be.eql({
                    read: true,
                    write: false,
                    'delete': false
                });
                done();
            }).catch(function(err) {
                done(err);
            });
        });
        it('returns correct permissions for unreadable document', function(done) {
            var aUnreadableDocument = testDocuments.read.no[0];

            security.getPermissions(aUnreadableDocument, ['read', 'write', 'delete']).then(function(permissions) {
                should.exist(permissions);
                permissions.should.be.eql({
                    read: false,
                    write: false,
                    'delete': false
                });
                done();
            }).catch(function(err) {
                done(err);
            });
        });
        it('returns correct permission for true rule', function(done) {
            security.getPermissions(simpleDocument, 'read').then(function(permissions) {
                should.exist(permissions);
                permissions.should.be.eql({
                    read: true
                });
                done();
            }).catch(function(err) {
                done(err);
            });
        });
    });
    describe('query hook Spec:', function() {
        describe('#find:', function() {
            it('returns only readable testDocuments for find all query', function(done) {
                TestModel.find().exec(function(err, documents) {
                    if (err) return done(err);
                    var orderedDocuments = _.sortBy(documents, '_id');
                    orderedDocuments.should.be.eql(_.sortBy(testDocuments.read.yes, '_id'));
                    done();
                });
            });
            it('returns only readable testDocuments for conditional find query', function(done) {
                TestModel.find({categories: 'music'}).exec(function(err, documents) {
                    if (err) return done(err);
                    documents.length.should.be.eql(1);
                    documents[0].should.be.eql(testDocuments.read.yes[2]);
                    done();
                });
            });
            it('returns only returns readable document for find all query with callback', function(done) {
                TestModel.find({}, function(err, documents) {
                    if (err) return done(err);
                    var orderedDocuments = _.sortBy(documents, '_id');
                    orderedDocuments.should.be.eql(_.sortBy(testDocuments.read.yes, '_id'));
                    done();
                });
            });
        });
        describe('#findById:', function() {
            it('returns readable document for findById query', function(done) {
                var aReadableDocument = testDocuments.read.yes[0];
                TestModel.findById(aReadableDocument._id).exec(function(err, document) {
                    if (err) return done(err);
                    should.exist(document);
                    document.should.be.eql(aReadableDocument);
                    done();
                });
            });
            it('returns readable document for findById query with callback', function(done) {
                var aReadableDocument = testDocuments.read.yes[0];
                TestModel.findById(aReadableDocument._id, function(err, document) {
                    if (err) return done(err);
                    should.exist(document);
                    document.should.be.eql(aReadableDocument);
                    done();
                });
            });
            it('does not return unreadable document for findById query', function(done) {
                var aUnreadableDocument = testDocuments.read.no[0];
                TestModel.findById(aUnreadableDocument._id).exec(function(err, document) {
                    if (err) return done(err);
                    should.not.exist(document);
                    done();
                });
            });
            it('does not return unreadable document for findById query with callback', function(done) {
                var aUnreadableDocument = testDocuments.read.no[0];
                TestModel.findById(aUnreadableDocument._id, function(err, document) {
                    if (err) return done(err);
                    should.not.exist(document);
                    done();
                });
            });
        });
    });
    describe('Save middleware Spec:', function() {
        it('allows to save writeable document', function(done) {
            var aWritableDocument = testDocuments.write.yes[0];
            var newName = aWritableDocument.name + ' (writable)';
            aWritableDocument.name = newName;
            aWritableDocument.save(function(err, document) {
                if (err) return done(err);
                document.name.should.be.eql(newName);
                done();
            });
        });
        it('denies to save a non writeable document', function(done) {
            var aNonWriteableDocument = testDocuments.write.no[0];
            aNonWriteableDocument.name = 'non writeable';
            aNonWriteableDocument.save(function(err) {
                should.exist(err);
                should.exist(err.reason);
                err.reason.should.be.eql('Unauthorized');
                done();
            });
        });
    });
    describe('Delete middleware Spec:', function() {
        it('allows to remove deletable document', function(done) {
            var aDeletableDocument = testDocuments.delete.yes[0];
            var id = aDeletableDocument._id;
            aDeletableDocument.remove(function(err) {
                if (err) return done(err);
                // make sure the document is actually deleted...
                security.securityManager.privileged(function() {
                    TestModel.find({_id: id}).exec(function(err, documents) {
                        if (err) return done(err);
                        documents.length.should.be.eql(0);
                        done();
                    });
                });
            });
        });
        it('denies to remove a undeletable document', function(done) {
            var aUndeletableDocument = testDocuments.delete.no[0];
            var id = aUndeletableDocument._id;
            aUndeletableDocument.remove(function(err) {
                should.exist(err);
                should.exist(err.reason);
                err.reason.should.be.eql('Unauthorized');
                // make sure the document was not removed
                security.securityManager.privileged(function() {
                    TestModel.find({_id: id}).exec(function(err, documents) {
                        if (err) return done(err);
                        documents.length.should.be.eql(1);
                        documents[0]._id.should.be.eql(id);
                        done();
                    });
                });
            });
        });
    });
    describe('Create middleware Spec:', function() {
        it('allows to create a creatable document', function(done) {
            var newDocument = new SimpleModel({
                name: 'New Document'
            });
            newDocument.save(function(err, document) {
                if (err) return done(err);
                security.securityManager.privileged(function() {
                    SimpleModel.find({name: 'New Document'}).exec(function(err, documents) {
                        if (err) return done(err);
                        documents.length.should.be.eql(1);
                        documents[0].name.should.be.eql(newDocument.name);
                        done();
                    });
                });
            });
        });
        it('denies to create a uncreatable document', function(done) {
            var newDocument = new TestModel({
                name: 'New Document'
            });
            newDocument.save(function(err, document) {
                should.exist(err);
                should.exist(err.reason);
                err.reason.should.be.eql('Unauthorized');
                done();
            });
        });
    });
});
