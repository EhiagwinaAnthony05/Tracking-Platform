function getValidationErrors(result) {
  return result.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }))
}

function validateRequest(schema) {
  return (req, res, next) => {
    const parsedBody = schema.safeParse(req.body)

    if (!parsedBody.success) {
      return res.status(400).json({
        message: 'Invalid request body',
        errors: getValidationErrors(parsedBody),
      })
    }

    req.validatedBody = parsedBody.data
    return next()
  }
}

module.exports = validateRequest