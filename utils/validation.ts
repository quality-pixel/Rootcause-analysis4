function validateProblemStatement(statement) {
    if (statement.length < 10) {
        return 'Problem statement must be at least 10 characters long.';
    }
    return null;
}

function validateCategoryName(category) {
    if (!category || category.trim() === '') {
        return 'Category name cannot be empty.';
    }
    return null;
}

function validateProjectInfo(project) {
    const requiredFields = ['name', 'description', 'startDate'];
    for (let field of requiredFields) {
        if (!project[field]) {
            return `Project info must include a valid ${field}.`;
        }
    }
    return null;
}

function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return 'Please provide a valid email address.';
    }
    return null;
}

module.exports = {
    validateProblemStatement,
    validateCategoryName,
    validateProjectInfo,
    validateEmail
};