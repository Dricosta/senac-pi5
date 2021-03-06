const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const UserOwner = require('../models/UserOwner')
const response = require('../models/Helpers/ResponseDefault')
const jwt = require('jsonwebtoken')
const verifyToken = require('../middleware/verifyJwt')
const upload = require('../middleware/upload')
const helperEdit = require('./helper/helperEdit')
const uploadPhotos = upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'capaPhoto', maxCount: 1 }])

router.post('/signin', async (req, res) => {
  const { email, password } = req.body

  try {
    const data = await UserOwner.findOne({ email })

    UserOwner.findOneAndUpdate({email}, { active: true }, {new: true}, (err, data) => {
      if (err) return res.status(500).json(response.send('error500'))
      data.save()
    })

    bcrypt.compare(password, data.password, (err, info)  => {
      if (!data || !info) {
        return res
          .status(403)
          .json(response.send('failLogin', null, 'Login inválido.'))
      }

      data.password = null
      res.setHeader('token', jwt.sign({ name: data.name }, process.env.PASS_TOKEN))
      res.status(200).json(response.send('successLogin', data))
    })
  } catch (e) {
    res.status(500).json(response.send('errorLogin'))
  }
})

router.post('/signup', async (req, res) => {
  const data = new UserOwner(req.body)

  if (data && data.email) {
    try {
      const infoUser = await UserOwner.findOne({ email: data.email })

      if (infoUser) {
        return res.status(403).json(response.send('error', null, 'Usuário já existe.'))
      }
    } catch (e) {
      res.status(500).json(response.send('errorLogin'))
    }
  }

  if (!data.validateSync()) {
    data.save()
    res.setHeader('token', jwt.sign({ name: data.name }, process.env.PASS_TOKEN))
    return res.status(200).json(response.send('success', data, 'Dados inseridos com sucesso.'))
  }

  res.status(406).json({
    statusCode: 406,
    status: 'error not acceptable',
    message: 'Dados inconsistentes.',
    result: {
      error: Object.keys(error.errors).map(item => error.errors[item].message)
    }
  })
})

router.put('/edit/:id', uploadPhotos, verifyToken, (req, res) => {
  if (!req.token) {
    return res.status(401).json(response.send('error401', null, 'O usuário não está autenticado.'))
  }

  UserOwner.findOneAndUpdate(req.params._id, helperEdit(req.body, req.files), {new: true}, (err, data) => {
    if (err) return res.status(500).json(response.send('error500'))
    data.save()
    res.status(200).json(response.send('success', data, 'Dados atualizados com sucesso.'))
  })
})

router.delete('/delete/:id', uploadPhotos, verifyToken, (req, res) => {
  if (!req.token) {
    return res.status(401).json(response.send('error401', null, 'O usuário não está autenticado.'))
  }

  UserOwner.findOneAndUpdate(req.params._id, { active: false }, {new: true}, (err, data) => {
    if (err) return res.status(500).json(response.send('error500'))
    data.save()
    res.status(200).json(response.send('removed', data, 'Usuario Removido com sucesso'))
  })
})

module.exports = router

