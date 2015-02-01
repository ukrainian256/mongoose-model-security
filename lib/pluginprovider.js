'use strict';

var unauthorized = require('./unauthorized');

module.exports = function(security) {
    function checkPermission(target, permission, next) {
        security.askPermission(target, permission).then(function(decision) {
            if (decision) {
                next();
            } else {
                next(unauthorized(target, permission));
            }
        }).catch(function(error) {
            next(unauthorized(target, permission, error));
        });
    }

    var securityMiddleWare = function(permission) {
        return function(next) {
            var doc = this;
            if (!doc.isNew) {
                checkPermission(doc, permission, next);
            } else {
                next();
            }
        };
    };

    var createSecurityMiddleWare = function(next) {
        var doc = this;
        if (doc.isNew) {
            checkPermission(doc, 'create', next);
        } else {
            next();
        }
    };

    return function(schema) {
        schema.pre('remove', securityMiddleWare('delete'));
        schema.pre('save', securityMiddleWare('write'));
        schema.pre('save', createSecurityMiddleWare);
    };
};