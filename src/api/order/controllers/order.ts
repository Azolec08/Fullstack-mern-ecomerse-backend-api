const stripe = require("stripe")(process.env.STRIPE_KEY);

/**
 * order controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async create(ctx) {
      const { products } = ctx.request.body;

      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product") // Updated to the correct service key
            .findOne(product.id);

          return {
            price_data: {
              currency: "PHP",
              product_data: {
                name: item.title,
              },
              unit_amount: item.price * 100,
            },
            quantity: product.quantity, // Use product's quantity as passed in the request body
          };
        })
      );

      try {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          success_url: `${process.env.CLIENT_URL}?success=true`,
          cancel_url: `${process.env.CLIENT_URL}?success=false`,
          line_items: lineItems,
          shipping_address_collection: { allowed_countries: ["PH"] },
          payment_method_types: ["card"],
        });

        await strapi.service("api::order.order").create({
          data: {
            products,
            stripeId: session.id,
          },
        });

        return { stripeSession: session };
      } catch (err) {
        ctx.response.status = 500;
        return err;
      }
    },
  })
);
