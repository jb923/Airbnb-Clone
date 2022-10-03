const express = require('express')
const { sequelize } = require('sequelize')
const { requireAuth } = require('../../utils/auth')
const { User, Spot, Booking, Review, SpotImage, ReviewImage } = require('../../db/models')
const { check, body } = require('express-validator')
const { handleValidationErrors } = require('../../utils/validation')
const { Op } = require('sequelize')

const router = express.Router()


//Get all Current User's Bookings
router.get('/current', requireAuth, async (req, res, next) => {

    const bookings = await Booking.findAll({
        where: {
            userId: req.user.id
        },
        include: [
            {
                model: Spot,
                attributes: {
                    exclude: ['createdAt', 'updatedAt', 'description']
                }
            }
        ]
    })

    const bookingsArray = []
    for (let booking of bookings) {
        const spot = await Spot.findByPk(booking.spotId)
        const spotImage = await SpotImage.findByPk(spot.id, {
            where: {
                preview: true
            }
        })

        let bookingData = booking.toJSON()
        bookingsArray.push(bookingData)
    }

    return res.json({ Bookings: bookingsArray })
})

//edit a booking
router.put('/:bookingId', requireAuth, async (req, res, next) => {
    const userId = req.user.id
    const booking = await Booking.findByPk(req.params.bookingId)

    if (!booking) {
        const err = new Error()
        err.message = "Booking not found"
        err.status = 404
        return next(err)
    }

    if (userId !== booking.userId) {
        const err = new Error()
        err.message = "Must be owner to edit booking"
        err.status = 404
        return next(err)
    }

    const { startDate, endDate } = req.body

    const startDateTime = new Date(startDate).getTime()
    const endDateTime = new Date(endDate).getTime()

    if (endDateTime < startDateTime) {
        const err = new Error()
        err.message = "endDate can't be on or before startDate"
        err.status = 400
        return next(err)
    }
    const startDateCheck = await Booking.findOne({
        where: {
            startDate: startDate
        }
    })
    const endDateCheck = await Booking.findOne({
        where: {
            endDate: endDate
        }
    })

    if (startDateCheck || endDateCheck) {
        const err = new Error()
        err.message = "Sorry, this spot is already booked for the specified dates"
        err.status = 403
        err.errors = {
            startDate: 'Start date conflicts with an existing booking',
            endDate: 'End date conflicts with an existing booking',
        }
        return next(err)
    }

    booking.update({ startDate, endDate})

    return res.json(booking)

})


module.exports = router
